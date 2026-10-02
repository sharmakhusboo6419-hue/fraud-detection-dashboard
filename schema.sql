-- Create Enum Types for Status
CREATE TYPE transaction_status AS ENUM ('APPROVED', 'REVIEW', 'BLOCKED');

-- Main Transactions Log Table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(64) UNIQUE NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    account_velocity_1h INT NOT NULL,
    device_risk_score NUMERIC(3, 2) NOT NULL,
    is_foreign_ip INT NOT NULL,
    hour_of_day INT NOT NULL,
    risk_score INT NOT NULL,
    raw_probability NUMERIC(5, 4) NOT NULL,
    status transaction_status NOT NULL,
    execution_time_ms NUMERIC(6, 2) NOT NULL,
    triggered_signals TEXT[], -- Array of triggered rule flags
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for High-Performance Queries & Velocity Tracking
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
