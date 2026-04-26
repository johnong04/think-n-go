<div align="center">

# Think 'n Go

**Agentic Web2 escrow + liquidity engine for Malaysian MSME supply chains.**

Built for **TNG Digital Finhack 2026** — Innovation Track.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![AWS Bedrock](https://img.shields.io/badge/AWS-Bedrock-FF9900?logo=amazonaws&logoColor=white)](https://aws.amazon.com/bedrock/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-RDS-4169E1?logo=postgresql&logoColor=white)](https://aws.amazon.com/rds/postgresql/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

---

## The problem

Malaysian micro-SMEs are paralysed by a liquidity trap:

- Corporate clients delay payments by an average of **64 days** (Experian 2025).
- Wholesalers operate on **NET-14 / NET-30** terms — but their MSME customers can't pay on time because their own receivables are frozen.
- Micro-merchants — food stalls, sundry shops, kedai runcit — can't fund peak-season inventory and are locked out of bank credit by thin CCRIS files.

Cash sits trapped in invoices. Nobody can move.

## The solution

Think 'n Go is an **agentic financial operating system** that sits between wholesalers and merchants. Two AI agents negotiate on behalf of their humans:

- **Merchant Agent (CFO)** — predicts demand from DuitNow QR velocity, underwrites BNPL micro-loans, locks escrow with mixed cash + credit, and auto-repays from daily QR sweeps.
- **Wholesaler Agent (Liquidity Broker)** — when the wholesaler needs cash today, scans active escrows, picks healthy merchants by anonymised QR velocity, and offers a discount for instant settlement.

Both agents are powered by **AWS Bedrock**. Escrow is a single atomic Postgres transaction — no blockchain, no smart contracts, just a strict ACID ledger.

## Demo flow (90 seconds)

> Three browser surfaces. One continuous money story. One ayam gepuk merchant.

| Stage | Surface | What happens |
|---|---|---|
| 1 | `/invoice-demo` | Wholesaler drafts a NET-14 invoice in plain English. Bedrock structures it: **INV-2026-0512 · RM 1,000**. |
| 2 | `/mobile-mock` | Ahmad's phone alerts: *velocity up 18%, stockout in 3 days*. He has RM 500. The Merchant Agent underwrites the other RM 500 BNPL and locks escrow. |
| 3 | `/dashboard` | KPI ticks **RM 5,600 → RM 6,600 LOCKED**. Ahmad's row appears in the escrow table. |
| 4 | `/dashboard` | Wholesaler is RM 800 short today. Clicks **Generate Instant Liquidity** — the Wholesaler Agent picks Ahmad, offers 2%. |
| 5 | `/mobile-mock` | Ahmad's agent does the math: *+RM 18.50 vs holding 14d at 4% APY → ACCEPT*. He taps accept. |
| 6 | `/dashboard` | Atomic settlement. Wholesaler **+RM 980**, Ahmad keeps the **RM 20** rebate. Ledger row hash slides in. |

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────┐  │
│  │ /invoice-demo│  │ /mobile-mock │  │ /dashboard              │  │
│  │ wholesaler   │  │ Ahmad's phone│  │ swarm command console   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬────────────┘  │
│         │                 │                       │                │
│         └─────── BroadcastChannel demo bus ───────┘                │
└─────────────────────────────┬────────────────────────────────────┘
                              │ REST
┌─────────────────────────────▼────────────────────────────────────┐
│                         BACKEND (FastAPI)                         │
│  /agent/merchant/*    /agent/supplier/*   /invoice/*   /demo/*    │
│  /msme/demand-pressure/*   /dashboard/kpis   /contracts/*         │
└──────────────┬──────────────────────────────┬────────────────────┘
               │                              │
       ┌───────▼────────┐            ┌────────▼─────────┐
       │  AWS Bedrock   │            │  AWS RDS Postgres │
       │  (reasoning)   │            │  (ACID ledger)    │
       └────────────────┘            └───────────────────┘
```

**Tech stack**

- **Frontend** — Next.js 16 (App Router, Turbopack), React 19, Tailwind v4, shadcn/ui, recharts, Vercel AI SDK v6, Framer Motion.
- **Backend** — FastAPI, uvicorn, boto3, psycopg.
- **AI** — AWS Bedrock (Nova Micro for live agent reasoning, streamed char-by-char into the UI).
- **Data** — AWS RDS PostgreSQL with `plpgsql` functions for atomic escrow lock / settle / mint.

## Quick start

### Prerequisites

- Node.js 20+
- Python 3.11+
- AWS account with Bedrock + RDS access (SSO profile recommended)

### Frontend

```bash
cd frontend
npm install
npm run dev
# http://localhost:3000
```

### Backend

```bash
cd backend
python -m venv venv
source venv/Scripts/activate          # Windows
# source venv/bin/activate            # macOS / Linux
pip install -r requirements.txt
cp .env.example .env                  # then fill in AWS + DB creds

aws sso login --profile <your-profile>
uvicorn app.main:app --reload
# http://127.0.0.1:8000
```

### Run the demo

1. Open `http://localhost:3000/dashboard` on the left.
2. Open `http://localhost:3000/mobile-mock` on the right.
3. Open `http://localhost:3000/invoice-demo` in a third tab.
4. Hit the hidden `[reset]` link in the dashboard footer to seed the baseline.
5. Follow the [Demo flow](#demo-flow-90-seconds) above.

## Repository layout

```
think-n-go/
├── frontend/              Next.js 16 app
│   ├── app/               App Router routes (/dashboard, /mobile-mock, /invoice-demo)
│   ├── components/        UI components (dashboard, mobile, invoice, ui)
│   └── lib/               api wrappers, demo bus, swarm state machine
├── backend/               FastAPI service
│   └── app/
│       ├── routers/       agent, invoice, demo, contracts, bedrock, msme
│       ├── services/      bedrock client, contract logic
│       ├── schemas/       Pydantic models
│       └── db/            seed_demo, plpgsql function callers
├── docs/                  design specs, demo scripts
├── specs.md               product vision, pinned versions
├── tasks.md               phased task list with progress log
└── CLAUDE.md              working conventions for AI-assisted dev
```

## Key features

- **Live Bedrock reasoning** streamed into the UI char-by-char — judges watch the agents *think*, not just respond.
- **Cross-window choreography** via a BroadcastChannel demo bus: a tap on the phone triggers a KPI tick on the dashboard in the same browser.
- **Atomic ledger** — escrow lock and settle run as single Postgres transactions calling `fn_mint_bnpl_escrow` and `fn_settle_contract_early`.
- **One-click reset** — a hidden footer link wipes and reseeds the demo dataset between runs.
- **Adversarial agent negotiation** — if the Wholesaler Agent proposes a bad discount, the Merchant Agent rejects with a math-based roast that surfaces on the dashboard.

## Status

Active hackathon build. See [`tasks.md`](tasks.md) for phase-by-phase progress and the project intelligence log. The demo flow above is end-to-end clickable today.

## Team

Team Think 'n Go — TNG Digital Finhack 2026, Innovation Track.

## License

[MIT](LICENSE)
