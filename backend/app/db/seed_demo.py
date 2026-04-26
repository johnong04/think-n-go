# backend/app/db/seed_demo.py
"""Idempotent demo seed. Wipes only rows tagged with the demo UUIDs and re-inserts.

Run via: python -m app.db.seed_demo
Or via: POST /demo/reset
"""
from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import delete, text
from sqlalchemy.dialects.postgresql import insert

from app.db.database import AsyncSessionLocal
from app.db.models import (
    Contract,
    ContractStatus,
    InvestmentLedger,
    Merchant,
    Supplier,
    Wallet,
)

# Stable UUIDs so reset is truly idempotent across runs.
WHOLESALER_ID = uuid.UUID("00000000-0000-4000-8000-000000000001")

MERCHANT_IDS = {
    "ahmad":   uuid.UUID("00000000-0000-4000-8000-000000000010"),
    "siti":    uuid.UUID("00000000-0000-4000-8000-000000000011"),
    "tan":     uuid.UUID("00000000-0000-4000-8000-000000000012"),
    "faisal":  uuid.UUID("00000000-0000-4000-8000-000000000013"),
    "rajesh":  uuid.UUID("00000000-0000-4000-8000-000000000014"),
}

CONTRACT_IDS = {
    "siti":   uuid.UUID("00000000-0000-4000-8000-000000000020"),
    "faisal": uuid.UUID("00000000-0000-4000-8000-000000000021"),
    "tan":    uuid.UUID("00000000-0000-4000-8000-000000000022"),
    "rajesh": uuid.UUID("00000000-0000-4000-8000-000000000023"),
}

WHOLESALER = {
    "id": WHOLESALER_ID,
    "name": "Pasar Borong Ahmad Trading",
    "tng_merchant_id": "TNG-PB-AHMAD",
    "wallet_balance": Decimal("37400.00"),
}

MERCHANTS = [
    {"id": MERCHANT_IDS["ahmad"],  "name": "Ahmad bin Yusof",  "wallet_balance": Decimal("760.00"),  "credit_score": 720},
    {"id": MERCHANT_IDS["siti"],   "name": "Siti Norhaliza",   "wallet_balance": Decimal("1840.00"), "credit_score": 685},
    {"id": MERCHANT_IDS["tan"],    "name": "Tan Mei Ling",     "wallet_balance": Decimal("3120.00"), "credit_score": 745},
    {"id": MERCHANT_IDS["faisal"], "name": "Mohd Faisal",      "wallet_balance": Decimal("510.00"),  "credit_score": 660},
    {"id": MERCHANT_IDS["rajesh"], "name": "Rajesh Kumar",     "wallet_balance": Decimal("2240.00"), "credit_score": 700},
]

# Business / location fields live denormalized on the contract rows
# (no merchants table column exists for them).
MERCHANT_PROFILES = {
    MERCHANT_IDS["ahmad"]:  {"business": "Ayam Gepuk Mak Cik",        "location": "Setapak, KL",       "phone": "012-345-6789"},
    MERCHANT_IDS["siti"]:   {"business": "Mart Wangsa",               "location": "Wangsa Maju, KL",   "phone": "012-345-1102"},
    MERCHANT_IDS["tan"]:    {"business": "Café Hang Tuah",            "location": "Bukit Bintang, KL", "phone": "016-220-4488"},
    MERCHANT_IDS["faisal"]: {"business": "Toko Buah Pasar Borong",    "location": "Selayang",          "phone": "019-330-7711"},
    MERCHANT_IDS["rajesh"]: {"business": "Kedai Runcit Sentral",      "location": "Brickfields, KL",   "phone": "017-455-9920"},
}


def _contract_row(*, contract_id, merchant_key, principal, term_days, days_in, status, product, qty, price):
    now = datetime.now(timezone.utc)
    locked_at = now - timedelta(days=days_in)
    profile = MERCHANT_PROFILES[MERCHANT_IDS[merchant_key]]
    return {
        "id": contract_id,
        "supplier_id": WHOLESALER_ID,
        "merchant_id": MERCHANT_IDS[merchant_key],
        "invoice_num": f"INV-2026-{str(contract_id)[:8].upper()}",
        "business_name": profile["business"],
        "supplier_name": WHOLESALER["name"],
        "supplier_ph": "03-6201-5500",
        "supplier_location": "Pudu Wholesale Market, KL",
        "receiver_name": next(m["name"] for m in MERCHANTS if m["id"] == MERCHANT_IDS[merchant_key]),
        "receiver_ph": profile["phone"],
        "receiver_location": profile["location"],
        "product": product,
        "quantity": Decimal(qty),
        "price_per_unit": Decimal(price),
        "total_price": Decimal(qty) * Decimal(price),
        "principal_amount": Decimal(principal),
        "total_amount": Decimal(principal),
        "yield_rate": Decimal("0.0400"),
        "net_days": f"Net-{term_days}",
        "status": status,
        "date_created": locked_at,
        "created_at": locked_at,
        "approved_at": locked_at if status != ContractStatus.PROPOSED else None,
        "funded_at": locked_at if status in (ContractStatus.FUNDED, ContractStatus.FUNDED_INVESTED, ContractStatus.SOLVED, ContractStatus.SETTLED) else None,
        "solved_at": now if status == ContractStatus.SOLVED else None,
        "settled_at": (now - timedelta(days=8)) if status == ContractStatus.SETTLED else None,
    }


CONTRACTS = [
    _contract_row(contract_id=CONTRACT_IDS["siti"],   merchant_key="siti",   principal="2400", term_days=14, days_in=11, status=ContractStatus.FUNDED_INVESTED, product="Beras 10kg",         qty=240, price=10),
    _contract_row(contract_id=CONTRACT_IDS["faisal"], merchant_key="faisal", principal="3200", term_days=30, days_in=2,  status=ContractStatus.FUNDED_INVESTED, product="Buah segar campur",  qty=160, price=20),
    _contract_row(contract_id=CONTRACT_IDS["tan"],    merchant_key="tan",    principal="1820", term_days=14, days_in=14, status=ContractStatus.SOLVED,          product="Kopi premium 1kg",   qty=26,  price=70),
    _contract_row(contract_id=CONTRACT_IDS["rajesh"], merchant_key="rajesh", principal="540",  term_days=30, days_in=30, status=ContractStatus.SETTLED,         product="Mineral water 500ml", qty=900, price=0.6),
]


async def run() -> dict:
    """Wipe demo rows and re-insert. Returns counts."""
    async with AsyncSessionLocal() as db:
        async with db.begin():
            # Order matters: contracts -> wallets -> merchants/suppliers (FKs)
            demo_contract_ids = list(CONTRACT_IDS.values())
            demo_merchant_ids = list(MERCHANT_IDS.values())

            await db.execute(delete(InvestmentLedger).where(InvestmentLedger.contract_id.in_(demo_contract_ids)))
            await db.execute(delete(Contract).where(Contract.id.in_(demo_contract_ids)))
            await db.execute(delete(Wallet).where(Wallet.user_id.in_([WHOLESALER_ID, *demo_merchant_ids])))
            await db.execute(delete(Merchant).where(Merchant.id.in_(demo_merchant_ids)))
            await db.execute(delete(Supplier).where(Supplier.id == WHOLESALER_ID))

            db.add(Supplier(**WHOLESALER))
            await db.flush()
            for m in MERCHANTS:
                db.add(Merchant(**m))
                await db.flush()

            # Contracts use a custom DB enum named `contract_status`; the SQLAlchemy
            # model declares Enum(ContractStatus) which asyncpg interprets as the
            # built-in lowercased name `contractstatus`, causing a type mismatch on
            # bulk insert. Use raw SQL with an explicit ::contract_status cast.
            contract_sql = text(
                """
                INSERT INTO contracts (
                    id, supplier_id, merchant_id, invoice_num,
                    business_name, supplier_name, supplier_ph, supplier_location,
                    receiver_name, receiver_ph, receiver_location,
                    product, quantity, price_per_unit, total_price,
                    principal_amount, total_amount, yield_rate, net_days,
                    status, date_created, created_at,
                    approved_at, funded_at, solved_at, settled_at
                ) VALUES (
                    :id, :supplier_id, :merchant_id, :invoice_num,
                    :business_name, :supplier_name, :supplier_ph, :supplier_location,
                    :receiver_name, :receiver_ph, :receiver_location,
                    :product, :quantity, :price_per_unit, :total_price,
                    :principal_amount, :total_amount, :yield_rate, :net_days,
                    CAST(:status AS contract_status), :date_created, :created_at,
                    :approved_at, :funded_at, :solved_at, :settled_at
                )
                """
            )
            for row in CONTRACTS:
                params = {**row, "status": row["status"].value}
                await db.execute(contract_sql, params)

            # Wallets (one per actor, balances mirror demo intent)
            from app.db.models import UserRole
            wallet_rows = [
                {"id": uuid.uuid4(), "user_id": WHOLESALER_ID, "role": UserRole.SUPPLIER, "balance": Decimal("37400.00")},
                *[
                    {"id": uuid.uuid4(), "user_id": m["id"], "role": UserRole.MERCHANT, "balance": m["wallet_balance"]}
                    for m in MERCHANTS
                ],
            ]
            for w in wallet_rows:
                db.add(Wallet(**w))
                await db.flush()

            # Investment ledger rows for the 2 active LOCKED contracts
            now = datetime.now(timezone.utc)
            ledger_rows = [
                {
                    "id": uuid.uuid4(),
                    "contract_id": CONTRACT_IDS["siti"],
                    "amount_held": Decimal("2400.00"),
                    "daily_yield_rate": Decimal("0.0400"),
                    "accrued_interest": Decimal("2.89"),
                    "last_accrual_date": now,
                },
                {
                    "id": uuid.uuid4(),
                    "contract_id": CONTRACT_IDS["faisal"],
                    "amount_held": Decimal("3200.00"),
                    "daily_yield_rate": Decimal("0.0400"),
                    "accrued_interest": Decimal("0.70"),
                    "last_accrual_date": now,
                },
            ]
            for l in ledger_rows:
                db.add(InvestmentLedger(**l))
                await db.flush()

    return {
        "ok": True,
        "wholesaler": WHOLESALER["name"],
        "merchants": len(MERCHANTS),
        "contracts": len(CONTRACTS),
    }


if __name__ == "__main__":
    result = asyncio.run(run())
    print(result)
