from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from ..database import get_db
from ..models import Transaction
from ..ml.inference import engine

router = APIRouter(prefix="/api/v1/transactions", tags=["Transactions"])

class RealTransactionPayload(BaseModel):
    customer_name: str
    card_last_four: str
    location: str
    amount: float
    is_foreign: bool = False
    failed_pin_attempts: int = 0
    distance_from_home_km: float = 0.0
    time_since_last_tx_sec: float = 3600.0

@router.post("/evaluate")
def evaluate_real_transaction(payload: RealTransactionPayload, db: Session = Depends(get_db)):
    # 1. Execute live inference with trained model
    ml_result = engine.predict_risk(
        amount=payload.amount,
        is_foreign=payload.is_foreign,
        failed_pin_attempts=payload.failed_pin_attempts,
        distance_km=payload.distance_from_home_km,
        time_delta_sec=payload.time_since_last_tx_sec
    )

    # 2. Store real evaluation in SQLite database
    tx_record = Transaction(
        customer_name=payload.customer_name,
        card_last_four=payload.card_last_four,
        location=payload.location,
        amount=payload.amount,
        risk_score=ml_result["risk_score"],
        status=ml_result["status"]
    )
    db.add(tx_record)
    db.commit()
    db.refresh(tx_record)

    return {
        "transaction_id": tx_record.id,
        "evaluation": ml_result,
        "persisted_record": {
            "customer": tx_record.customer_name,
            "risk_score": tx_record.risk_score,
            "status": tx_record.status
        }
    }

@router.get("/high-risk")
def get_high_risk_transactions(db: Session = Depends(get_db)):
    return db.query(Transaction).filter(Transaction.risk_score >= 50).order_by(Transaction.id.desc()).all()
