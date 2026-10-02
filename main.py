from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from datetime import datetime, timezone
import sqlite3
import json
import os
import sys

# Make backend/app/ml importable regardless of the launch directory.
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", "app", "ml"))

try:
    from inference import engine as ml_engine
except Exception as _ml_exc:  # pragma: no cover - keep API alive without ML
    ml_engine = None
    _ML_IMPORT_ERROR = str(_ml_exc)

app = FastAPI(title="ShieldAI Risk Intelligence Engine")

# Absolute paths matter on hosted platforms, where the working directory is not
# the repo root and the filesystem may be read-only or ephemeral.
# SHIELD_DB_PATH lets a container point at a mounted volume.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("SHIELD_DB_PATH", os.path.join(BASE_DIR, "shield.db"))

# Allow the deployed frontend origin (and anything else) so the browser is not
# blocked by CORS when the frontend and API live on different domains.
_allowed = os.environ.get("SHIELD_ALLOWED_ORIGINS", "*")
_allowed_origins = (
    [o.strip() for o in _allowed.split(",") if o.strip()] if _allowed != "*" else ["*"]
)

# ---------------------------------------------------------------------------
# Real-time hub: every scored transaction is pushed to all connected clients
# ---------------------------------------------------------------------------
live_clients: list[WebSocket] = []


async def broadcast(event: dict) -> None:
    """Push an event to every connected dashboard. Dead sockets are pruned."""
    dead = []
    for ws in live_clients:
        try:
            await ws.send_text(json.dumps(event))
        except Exception:
            dead.append(ws)
    for ws in dead:
        if ws in live_clients:
            live_clients.remove(ws)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def query_transactions(limit: int = 50, min_risk: int = 0) -> list[dict]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, customer_name, card_last_four, location, amount, is_foreign,
               failed_pin_attempts, risk_score, status, source, created_at
        FROM transactions
        WHERE risk_score >= ?
        ORDER BY id DESC
        LIMIT ?
        """,
        (min_risk, limit),
    )
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def query_stats() -> dict:
    """Aggregate KPIs straight from the database so the UI never fakes numbers."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT
            COUNT(*)                                                   AS total,
            COALESCE(SUM(CASE WHEN status = 'Blocked'  THEN 1 ELSE 0 END), 0) AS blocked,
            COALESCE(SUM(CASE WHEN status = 'Review'   THEN 1 ELSE 0 END), 0) AS review,
            COALESCE(SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END), 0) AS approved,
            COALESCE(SUM(CASE WHEN status = 'Blocked'  THEN amount ELSE 0 END), 0) AS prevented_loss,
            COALESCE(SUM(amount), 0)                                     AS gross_volume
        FROM transactions
        """
    )
    row = dict(cursor.fetchone())

    # Hourly volume for the last 10 hours -> chart series
    cursor.execute(
        """
        SELECT strftime('%H:00', created_at) AS hour, COUNT(*) AS volume
        FROM transactions
        WHERE created_at >= datetime('now', '-10 hours')
        GROUP BY hour
        ORDER BY hour
        """
    )
    series = [{"time": r["hour"], "volume": r["volume"]} for r in cursor.fetchall()]
    conn.close()

    total = row["total"] or 0
    flagged = row["blocked"] + row["review"]
    recent = query_transactions(limit=200)
    return {
        "transactions_screened": total,
        "prevented_loss": round(row["prevented_loss"], 2),
        "flagged": flagged,
        "approved": row["approved"],
        "blocked": row["blocked"],
        "review": row["review"],
        "gross_volume": round(row["gross_volume"], 2),
        "avg_risk_score": round(
            sum(t["risk_score"] for t in recent) / max(len(recent), 1), 1
        ),
        "flagged_pct": round((flagged / total) * 100, 1) if total else 0.0,
        "approved_pct": round((row["approved"] / total) * 100, 1) if total else 0.0,
        "series": series,
        "generated_at": now_iso(),
    }


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT NOT NULL,
            card_last_four TEXT NOT NULL,
            location TEXT NOT NULL,
            amount REAL NOT NULL,
            is_foreign INTEGER NOT NULL,
            failed_pin_attempts INTEGER NOT NULL,
            risk_score INTEGER NOT NULL,
            status TEXT NOT NULL,
            source TEXT DEFAULT 'Manual',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # Migration: Ensure 'source' column exists if DB was created previously
    cursor.execute("PRAGMA table_info(transactions)")
    columns = [col[1] for col in cursor.fetchall()]
    if 'source' not in columns:
        cursor.execute("ALTER TABLE transactions ADD COLUMN source TEXT DEFAULT 'Manual'")

    conn.commit()
    conn.close()

init_db()


@app.on_event("startup")
async def _seed_if_empty() -> None:
    """Give the dashboard something real to show on a cold database."""
    if not query_transactions(limit=1):
        seed = [
            ("Maya K.", "4192", "Amsterdam, NL", 8420.00, 1, 3, 94, "Blocked", "Stripe Webhook"),
            ("Jonas D.", "8801", "Singapore, SG", 3180.50, 1, 0, 68, "Review", "Stripe Webhook"),
            ("Aditi R.", "2490", "Mumbai, IN", 2750.00, 1, 0, 71, "Review", "Manual UI"),
            ("Liam P.", "0063", "London, UK", 6925.40, 0, 1, 55, "Review", "Manual UI"),
            ("Sofia M.", "3321", "Austin, US", 240.00, 0, 0, 10, "Approved", "Manual UI"),
        ]
        conn = sqlite3.connect(DB_PATH)
        conn.executemany(
            """INSERT INTO transactions
               (customer_name, card_last_four, location, amount, is_foreign,
                failed_pin_attempts, risk_score, status, source)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            seed,
        )
        conn.commit()
        conn.close()
        await broadcast({"type": "reset", "reason": "seeded"})

def evaluate_risk(amount: float, is_foreign: bool, failed_pin_attempts: int, distance_km: float = 0.0, time_since_last_sec: float = 0.0) -> tuple[int, str, dict]:
    """
    Score with the trained model when available, otherwise fall back to the
    transparent rule engine. Returns (risk_score, status, detail) where detail
    carries the model's measured probability and per-feature contributions.
    """
    if ml_engine is not None and ml_engine.is_ready:
        verdict = ml_engine.predict_risk(
            amount=amount,
            is_foreign=is_foreign,
            failed_pin_attempts=failed_pin_attempts,
            distance_km=distance_km,
            time_delta_sec=time_since_last_sec,
        )
        return int(verdict["risk_score"]), verdict["status"], verdict

    risk_score = 10
    if amount > 1000:
        risk_score += 30
    if is_foreign:
        risk_score += 25
    if failed_pin_attempts > 1:
        risk_score += 25
    if distance_km > 500:
        risk_score += 10
    risk_score = min(risk_score, 100)
    status = "Blocked" if risk_score >= 75 else ("Review" if risk_score >= 40 else "Approved")
    return risk_score, status, {"model": "rule-engine-fallback", "contributions": []}

def save_transaction(customer: str, card_4: str, loc: str, amt: float, foreign: bool, pins: int, score: int, status: str, source: str) -> dict:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO transactions (customer_name, card_last_four, location, amount, is_foreign, failed_pin_attempts, risk_score, status, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (customer, card_4, loc, amt, int(foreign), pins, score, status, source))
    row = dict(cursor.execute("SELECT * FROM transactions WHERE id = ?", (cursor.lastrowid,)).fetchone())
    conn.commit()
    conn.close()
    return row

class TransactionInput(BaseModel):
    customer_name: str
    card_last_four: str
    location: str
    amount: float
    is_foreign: bool
    failed_pin_attempts: int
    distance_from_home_km: float
    time_since_last_tx_sec: float = 0.0


def _risk_signals(amount: float, is_foreign: bool, pins: int, distance: float, since_last: float):
    """Human-readable reasons behind a score - shown live in the UI."""
    reasons = []
    if amount > 1000:
        reasons.append("Unusually high amount")
    if is_foreign:
        reasons.append("Foreign card origin")
    if pins > 1:
        reasons.append(f"{pins} failed PIN attempts")
    if distance > 500:
        reasons.append(f"{int(distance)}km from home region")
    if since_last and since_last < 60:
        reasons.append(f"Repeat charge within {int(since_last)}s")
    return reasons


@app.post("/api/v1/transactions/evaluate")
async def evaluate_transaction(tx: TransactionInput):
    risk_score, status, detail = evaluate_risk(
        amount=tx.amount,
        is_foreign=tx.is_foreign,
        failed_pin_attempts=tx.failed_pin_attempts,
        distance_km=tx.distance_from_home_km,
        time_since_last_sec=tx.time_since_last_tx_sec,
    )
    row = save_transaction(tx.customer_name, tx.card_last_four, tx.location, tx.amount, tx.is_foreign, tx.failed_pin_attempts, risk_score, status, "Manual UI")
    await broadcast({
        "type": "transaction",
        "transaction": row,
        "risk_score": risk_score,
        "status": status,
        "reasons": _risk_signals(tx.amount, tx.is_foreign, tx.failed_pin_attempts, tx.distance_from_home_km, tx.time_since_last_tx_sec),
        "stats": query_stats(),
        "emitted_at": now_iso(),
    })
    return {
        "evaluation": {
            "risk_score": risk_score,
            "status": status,
            "reasons": _risk_signals(tx.amount, tx.is_foreign, tx.failed_pin_attempts, tx.distance_from_home_km, tx.time_since_last_tx_sec),
            "model": detail.get("model"),
            "fraud_probability": detail.get("fraud_probability"),
            "contributions": detail.get("contributions", []),
        }
    }

@app.post("/api/v1/webhooks/stripe")
async def stripe_webhook(request: Request):
    payload = await request.json()
    event_type = payload.get("type", "")

    if event_type in ["payment_intent.succeeded", "charge.succeeded", "payment_intent.payment_failed"]:
        data_obj = payload.get("data", {}).get("object") or {}

        amount = (data_obj.get("amount") or 0) / 100.0
        billing = data_obj.get("billing_details") or {}
        customer_name = billing.get("name") or data_obj.get("customer") or "Webhook Customer"

        pm_details = data_obj.get("payment_method_details") or {}
        card_details = pm_details.get("card") or {}
        card_last_four = card_details.get("last4") or "0000"
        country = card_details.get("country") or "US"

        is_foreign = country.upper() != "US"
        failed_pins = 2 if event_type == "payment_intent.payment_failed" else 0

        risk_score, status, detail = evaluate_risk(
            amount=amount,
            is_foreign=is_foreign,
            failed_pin_attempts=failed_pins
        )

        row = save_transaction(
            customer=customer_name,
            card_4=card_last_four,
            loc=f"Stripe ({country})",
            amt=amount,
            foreign=is_foreign,
            pins=failed_pins,
            score=risk_score,
            status=status,
            source="Stripe Webhook"
        )
        await broadcast({
            "type": "transaction",
            "transaction": row,
            "risk_score": risk_score,
            "status": status,
            "reasons": _risk_signals(amount, is_foreign, failed_pins, 0, 0),
            "stats": query_stats(),
            "emitted_at": now_iso(),
        })

        return {"status": "success", "processed_event": event_type, "assigned_risk_score": risk_score}

    return {"status": "ignored", "message": f"Event type {event_type} not monitored"}

@app.get("/api/v1/transactions/high-risk")
def get_high_risk_transactions(limit: int = 50, min_risk: int = 0):
    return query_transactions(limit=limit, min_risk=min_risk)


@app.get("/api/v1/dashboard/stats")
def get_dashboard_stats():
    return query_stats()


@app.get("/api/v1/model/metrics")
def get_model_metrics():
    """
    Measured model performance from the held-out test set, plus the operating
    bands actually in use. Every value here is computed at training time and
    read from disk - nothing is estimated at request time.
    """
    if ml_engine is None:
        return {
            "loaded": False,
            "error": globals().get("_ML_IMPORT_ERROR", "inference module unavailable"),
        }
    return ml_engine.health()


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "live_clients": len(live_clients), "time": now_iso()}


@app.websocket("/ws/live")
async def live_feed(ws: WebSocket):
    """Push-based feed: dashboard receives every scored transaction instantly."""
    await ws.accept()
    live_clients.append(ws)
    try:
        # Send a full snapshot on connect so a fresh tab is never empty
        await ws.send_text(json.dumps({
            "type": "snapshot",
            "transactions": query_transactions(limit=50),
            "stats": query_stats(),
            "emitted_at": now_iso(),
        }))
        while True:
            # Client heartbeats keep the connection alive through proxies
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        if ws in live_clients:
            live_clients.remove(ws)


@app.post("/api/v1/simulate")
async def simulate_traffic(count: int = 5):
    """Demo helper: generates realistic traffic so the live feed has motion."""
    import random
    names = ["Maya K.", "Jonas D.", "Aditi R.", "Liam P.", "Noah B.", "Zara H.",
             "Omar F.", "Elena V.", "Kai T.", "Priya S.", "Diego M.", "Aya N."]
    cities = ["Austin, US", "Amsterdam, NL", "Singapore, SG", "Mumbai, IN",
              "London, UK", "Tokyo, JP", "Lagos, NG", "Berlin, DE"]
    created = 0
    for _ in range(max(1, min(count, 50))):
        amount = round(random.uniform(12, 9500), 2)
        foreign = random.random() > 0.55
        pins = random.choice([0, 0, 0, 1, 2, 3])
        distance = round(random.uniform(0, 1400), 1)
        score, status = evaluate_risk(amount, foreign, pins, distance)[:2]
        row = save_transaction(
            customer=random.choice(names),
            card_4=f"{random.randint(1000, 9999)}",
            loc=random.choice(cities),
            amt=amount,
            foreign=foreign,
            pins=pins,
            score=score,
            status=status,
            source="Live Simulator",
        )
        await broadcast({
            "type": "transaction",
            "transaction": row,
            "risk_score": score,
            "status": status,
            "reasons": _risk_signals(amount, foreign, pins, distance, 0),
            "stats": query_stats(),
            "emitted_at": now_iso(),
        })
        created += 1
    return {"created": created}
