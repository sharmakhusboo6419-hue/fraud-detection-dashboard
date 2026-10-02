from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from .routes import dashboard, transactions

# Automatically create tables in shield.db
Base.metadata.create_all(bind=engine)

app = FastAPI(title="ShieldAI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "online", "service": "ShieldAI Engine", "docs": "/docs"}

app.include_router(dashboard.router)
app.include_router(transactions.router)
