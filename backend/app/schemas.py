from pydantic import BaseModel
from datetime import datetime

class TransactionBase(BaseModel):
    customer_name: str
    card_last_four: str
    location: str
    amount: float
    risk_score: int
    status: str

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
