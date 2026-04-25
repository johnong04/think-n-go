-- Refined Agentic Liquidity Engine schema (PostgreSQL)
-- Run with: psql -h <host> -U <user> -d <db> -f app/db/refined_schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contract_status') THEN
        CREATE TYPE contract_status AS ENUM (
            'PROPOSED',
            'MERCHANT_APPROVED',
            'FUNDED',
            'SOLVED',
            'RELEASED',
            'AGREED',
            'FUNDED_INVESTED',
            'SETTLED',
            'DISPUTED'
        );
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(32),
    location VARCHAR(255),
    tng_merchant_id VARCHAR(64) UNIQUE,
    wallet_balance NUMERIC(15,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(32),
    location VARCHAR(255),
    wallet_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
    credit_score INTEGER
);

CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Invoice & actor details
    invoice_num VARCHAR(50),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
    business_name VARCHAR(255),
    supplier_name VARCHAR(255),
    supplier_ph VARCHAR(20),
    supplier_location TEXT,
    receiver_name VARCHAR(255),
    receiver_ph VARCHAR(20),
    receiver_location TEXT,
    
    -- Product information
    product VARCHAR(255),
    quantity NUMERIC(15,2),
    price_per_unit NUMERIC(15,2),
    total_price NUMERIC(15,2),
    signature_url TEXT,

    -- Financial fields
    principal_amount NUMERIC(15,2) NOT NULL,
    total_amount NUMERIC(15,2),
    yield_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0350,
    
    -- Legacy compatibility fields
    invoice_ref VARCHAR(128),
    net_days VARCHAR(16),
    description VARCHAR(512),

    -- Status & metadata
    status contract_status NOT NULL DEFAULT 'PROPOSED',
    terms_metadata JSONB,

    -- Timestamps
    date_created TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    funded_at TIMESTAMPTZ,
    solved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_contracts_supplier_id ON contracts (supplier_id);
CREATE INDEX IF NOT EXISTS ix_contracts_merchant_id ON contracts (merchant_id);

CREATE TABLE IF NOT EXISTS escrow_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL UNIQUE REFERENCES contracts(id) ON DELETE CASCADE,
    locked_amount NUMERIC(15,2) NOT NULL,
    is_invested BOOLEAN NOT NULL DEFAULT TRUE,
    vault_status VARCHAR(32) NOT NULL DEFAULT 'HOLDING'
);

CREATE TABLE IF NOT EXISTS mock_investments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL UNIQUE REFERENCES contracts(id) ON DELETE CASCADE,
    apy_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0345,
    accrued_yield NUMERIC(15,6) NOT NULL DEFAULT 0,
    investment_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_recalc_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS WALLETS (
    ID UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    USER_ID UUID NOT NULL,
    BALANCE NUMERIC(15,2) NOT NULL DEFAULT 0,
    ROLE VARCHAR(16) NOT NULL CHECK (ROLE IN ('SUPPLIER', 'MERCHANT')),
    CURRENCY VARCHAR(3) NOT NULL DEFAULT 'USD',
    UPDATED_AT TIMESTAMPTZ NOT NULL DEFAULT NOW()
)