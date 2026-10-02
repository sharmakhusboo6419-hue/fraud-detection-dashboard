import asyncio
import json
import random
import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

HEARTBEAT_TIMEOUT = 30.0

@router.websocket("/ws/dashboard")
async def websocket_dashboard(websocket: WebSocket):
    await websocket.accept()
    
    last_seen = time.time()

    async def receive_pings():
        nonlocal last_seen
        try:
            while True:
                data_str = await websocket.receive_text()
                data = json.loads(data_str)
                
                if data.get("type") == "PING":
                    last_seen = time.time()
                    await websocket.send_json({"type": "PONG", "timestamp": time.time()})
        except (WebSocketDisconnect, json.JSONDecodeError, Exception):
            pass

    async def broadcast_updates():
        nonlocal last_seen
        try:
            while True:
                await asyncio.sleep(3)
                
                if time.time() - last_seen > HEARTBEAT_TIMEOUT:
                    print("[WebSocket] Client heartbeat timed out. Closing dead socket.")
                    await websocket.close(code=1001, reason="Heartbeat timeout")
                    break

                live_data = {
                    "type": "METRIC_TICK",
                    "risk_score": random.randint(70, 80),
                    "model_latency": f"{random.randint(38, 45)}ms",
                    "screened_count": "24,891"
                }
                await websocket.send_json(live_data)
        except (WebSocketDisconnect, Exception):
            pass

    receive_task = asyncio.create_task(receive_pings())
    broadcast_task = asyncio.create_task(broadcast_updates())

    done, pending = await asyncio.wait(
        [receive_task, broadcast_task],
        return_when=asyncio.FIRST_COMPLETED
    )

    for task in pending:
        task.cancel()
