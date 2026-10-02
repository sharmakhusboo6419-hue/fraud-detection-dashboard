from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from .database import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String, index=True)
    card_last_four = Column(String(4))
    location = Column(String)
    amount = Column(Float)
    risk_score = Column(Integer)
    status = Column(String, default="Queued")
    created_at = Column(DateTime, default=datetime.utcnow)
