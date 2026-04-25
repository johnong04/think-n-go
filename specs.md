# Product Specification: Think 'n Go (Agentic Supply Chain & Liquidity Engine)

## 1. Hackathon Context & Development Philosophy

- **Event:** TNG Digital Finhack 2026 (Innovation Track).
- **Optimization Goal:** Prioritize rapid feature shipping, "Vibe Coding" workflows, and high-impact visual demos over tight security testing or extensive unit tests.
- **Aesthetic Constraint:** "Management Consulting" visual hierarchy (McKinsey/BCG style). High data-ink ratio, stark contrasts, professional typography. No cluttered or generic "AI chatbot" wrappers.

## 2. Core Problem & Economic Context (Malaysia 2026)

The Malaysian Micro-SME (MSME) B2B supply chain is paralyzed by a severe liquidity trap:

- **The Corporate Delay:** Large corporate clients delay payments to MSMEs by an average of **64 days** (Experian 2025).
- **The Wholesale Friction:** Upstream wholesalers operate on **Net-14 to Net-30 day** trade credit. However, because MSMEs are starved of cash by corporates, they cannot pay wholesalers on time.
- **The Micro-SME Growth Ceiling:** Micro-merchants (e.g., food stalls) lack the upfront cash to buy bulk inventory for peak/festive seasons and are excluded from traditional bank loans due to a lack of formal CCRIS credit histories.

## 3. Solution Architecture

We are deploying an Agentic Parametric Web2 Escrow to act as an autonomous financial operating system between the Wholesaler and the MSME. (Note: This strictly uses Web2 APIs and PostgreSQL, **not** blockchain smart contracts).

### 3.1 The Merchant Side (Agentic CFO)

- **Predictive Growth:** The AI analyzes the merchant's historical DuitNow QR sales and upcoming seasonal trends. It proactively alerts the merchant: _"Predictive demand indicates you will sell out in 3 days. Recommend 2x bulk order. You are RM 500 short."_
- **Automated BNPL & Funding:** If the merchant approves, the AI instantly funds the RM 500 shortfall via a fractional TNG BNPL micro-loan.
- **Escrow & Yield:** The total payment is locked into a TNG GO+ Escrow. The AI dashboard shows the merchant exactly how much daily interest they are earning in TNG versus traditional banks while the funds sit in escrow.
- **Frictionless Repayment:** TNG automatically deducts a small fraction (e.g., 5%) from the merchant's daily incoming DuitNow QR customer payments to settle the BNPL line seamlessly.

### 3.2 The Wholesaler Side (Instant Liquidity Broker)

- **Privacy-Preserving Insights:** The Wholesaler's AI analyzes their MSME clients' financial health using TNG's internal alternative data (GO+ balances, QR velocity) _without_ exposing raw data to the wholesaler.
- **The "Instant Liquidity" Trigger:** When the wholesaler needs cash to pay their own suppliers, they click one button. Their AI autonomously sends targeted offers strictly to healthy MSMEs: _"Take a 2% discount to release your escrow payment today instead of waiting 14 days."_ \* **Automated Settlement:** If the MSME's AI calculates the arbitrage is favorable, the escrow is instantly released, liquidating the wholesaler's receivables on demand.

## 4. UI/UX Specifications (Split-Window Demo Architecture)

The live demo will utilize a split-browser window setup: 20% of the screen running the Mobile Route (`/mobile-mock`), and 80% running the Desktop Dashboard Route (`/dashboard`).

### 4.1 The Mobile Route (`/mobile-mock`)

- A standalone web page simulating a smartphone screen using a fixed aspect ratio and Tailwind CSS device bezels.
- It actively listens for WebSockets or state changes from the backend. When the Wholesaler AI executes an action, this route renders the incoming push notification and "Accept" button for Ahmad.

### 4.2 The Desktop Dashboard Route (`/dashboard`)

This is the primary enterprise Web2 view, split strictly into two internal zones. Do not embed any mobile UI here.

- **Zone 1: The Business Stage (Left - 60% Width):**
  - _Liquidity Health Chart:_ A sleek area chart projecting 30-day cash flow versus upcoming accounts payable.
  - _Escrow Pipeline Table:_ A `shadcn/ui` data table displaying active clients. Key columns: Merchant Entity, Trade Terms (Net-14), Escrow Status (Locked/Pending), and a quick-action "Generate Liquidity" button.
- **Zone 2: The Swarm Command Console (Right - 40% Width):**
  - Dedicated exclusively to visualizing the AI's reasoning via Generative UI.
  - Must render rich, interactive React components (Kokonut UI/21st.dev) stacked vertically, such as JSON parsing blocks, dynamic yield arbitrage sliders, and execution receipts.

### 4.3 Design Constraints

- **Aesthetic:** "Management Consulting" clean combined with Vercel/Linear modernism. High data-ink ratio, stark contrasts.
- **Colors:** Crisp White/Silver backgrounds, TNG Corporate Blue for structure and primary actions, TNG Yellow strictly for highlighting AI agent actions and pulsing visual indicators.

## 6. Specific Feature Logic (Agentic & Analytics)

### 6.1 Merchant UI: Treasury Impact Dashboard
Ahmad's mobile interface must include a persistent "Treasury Impact" component. This is a dynamic data visualization that tracks:
* **Cumulative Yield Retained:** The total GO+ interest earned across all Net-14 escrows.
* **BNPL Revenue Multiplier:** A calculated metric showing estimated extra revenue generated from inventory purchased exclusively via the AI-underwritten BNPL facility.

### 6.2 Agentic Tool: Predictive Liquidation Targeting (Wholesaler AI)
The Wholesaler AI will not use static, rule-based targeting. It will execute the `evaluate_network_liquidity()` tool, which relies on real-time data:
* **Anonymized QR Velocity:** The AI queries the TNG backend for the real-time DuitNow QR transaction velocity of all merchants holding locked escrows.
* **Selection Logic:** It strictly targets merchants experiencing high transaction volume (indicating strong cash flow and the ability to accept an early settlement). 
* **Adversarial Negotiation:** If the Wholesaler AI proposes a mathematically inferior discount to a highly liquid merchant, the receiving Merchant AI is programmed to reject the payload and return a sharp, math-based roast to the Wholesaler's UI.

## 5. Technical Stack (Optimized for Rapid AI-Assisted Development)

- **Framework:** Next.js 16 (App Router, Turbopack)
- **AI Orchestration:** Vercel AI SDK (utilizing advanced `tool()` functions, structured JSON outputs, and React Server Components for streaming generative UI).
- **Database (Strict ACID Ledger):** Supabase (PostgreSQL). Essential for atomic double-entry accounting (Escrow locks/releases) and Realtime WebSockets for instant UI updates.
- **Component Libraries:**
  - **shadcn/ui:** For core, accessible, unstyled baseline components.
  - **Kokonut UI (https://kokonutui.com/docs) & 21st.dev (https://21st.dev/community/components):** For modern, animated, copy-paste AI generative components (e.g., animated prompt boxes, dynamic status nodes) to elevate the demo quality.
- **Data Strategy:** Use intelligent mocking for external APIs (like logistics tracking), but use a live Supabase instance to prove the backend ledger updates are real.

## 6. Standard Operating Procedures & User Flows

### 6.1 The Baseline Flow (Standard Net-14 Escrow)
This is the default chronological sequence when neither the Wholesaler nor the Merchant requires AI intervention.
1. **The Invoice:** The Wholesaler presents a Dynamic DuitNow QR code to the Merchant (encoding the RM 1,000 amount and Net-14 terms).
2. **The Scan:** Merchant (Ahmad) scans the QR code via the TNG eWallet app.
3. **The Lock:** RM 1,000 is deducted from Ahmad's liquid balance and securely locked in the TNG GO+ Escrow ledger. 
4. **The Yield:** Over the next 14 days, the locked RM 1,000 generates daily GO+ money market yield for the TNG ecosystem.
5. **The Settlement:** On exactly Day 14, the escrow automatically unlocks, routing the principal RM 1,000 to the Wholesaler's account.

### 6.2 Scenario A: Wholesaler Initiates Liquidation (Early Release)
This flow occurs when the Wholesaler faces a cash shortfall and requires immediate liquidity before the 14-day term expires.
1. **The Trigger:** The Wholesaler logs into the Desktop Dashboard, sees a "Liquidity Shortfall" warning, and clicks "Generate Instant Liquidity."
2. **The AI Calculation:** The Wholesaler's AI Agent identifies Ahmad's locked Net-14 escrow (RM 1,000). It calculates that a 2% discount is the optimal mathematically viable offer.
3. **The Handshake:** The AI Agent transmits this offer to Ahmad's Merchant AI.
4. **The Merchant Notification:** Ahmad receives a push notification on his mobile app: *"Supplier offers 2% (RM 20) discount for early escrow release."*
5. **The Parametric Execution:** Ahmad clicks **"Accept"**. The escrow is instantly dissolved. RM 980 is credited to the Wholesaler, and the RM 20 discount is credited back to Ahmad's wallet.

### 6.3 Scenario B: Merchant Initiates BNPL (Predictive Restock)
This flow occurs when the Merchant's AI detects a supply shortage but the Merchant lacks the upfront cash to secure the Net-14 escrow.
1. **The Trigger:** Ahmad's mobile app displays an AI Alert: *"High demand projected. Recommend RM 1,000 bulk order. Cash shortfall: RM 500."*
2. **The Funding Request:** Ahmad clicks **"Fund & Order"** on the notification. 
3. **The AI Underwriting:** The Merchant AI Agent instantly verifies Ahmad's past QR transaction velocity to approve a RM 500 fractional BNPL micro-loan.
4. **The Mixed-Fund Lock:** The Escrow is created using RM 500 of Ahmad's existing cash + RM 500 from the newly approved BNPL line. The Wholesaler sees a fully secured RM 1,000 locked escrow on their dashboard and dispatches the goods.
5. **The Automated Repayment:** As Ahmad sells the goods to end-consumers via his DuitNow QR code, the AI automatically sweeps 5% of every incoming customer payment directly toward settling the RM 500 BNPL balance.

## 7. Pinned Dependency Versions (verified 2026-04-25)

These versions are the floor — collaborators install with `npm install` / `pip install -r requirements.txt` and must not silently downgrade. Bump deliberately, not casually, before demo day.

### 7.1 Frontend (`/frontend/package.json`)

| Package                 | Pinned Range              | Notes                                                                                |
| ----------------------- | ------------------------- | ------------------------------------------------------------------------------------ |
| `next`                  | `^16.0.0` (latest 16.2.2) | App Router; Turbopack is default — no `--turbopack` flag needed in 16.               |
| `react` / `react-dom`   | `^19.0.0`                 | RSC + streaming generative UI.                                                       |
| `ai` (Vercel AI SDK)    | `^6.0.168`                | npm `latest`. Use `tool()` + `streamText` + `useChat`.                               |
| `zod`                   | `^3.23.8`                 | Required for AI SDK `tool({ inputSchema })` definitions.                             |
| `@supabase/supabase-js` | `^2.x` (latest 2.104.1)   | Postgres client + Realtime WebSockets. Add when wiring DB.                           |
| `shadcn` (CLI)          | `^2.104.1`                | Run `npx shadcn@latest add <component>`. Components are vendored, not a runtime dep. |
| `tailwindcss`           | `^4.0.0` (latest 4.2.4)   | Tailwind v4 — config-less, CSS-first.                                                |
| `lucide-react`          | `^0.468.0`                | Icon set.                                                                            |
| `typescript`            | `^5.7.2`                  |                                                                                      |

**Generative UI sources (copy-paste, unversioned):** Kokonut UI, 21st.dev. Pull components into `/frontend/app/components/` as needed.

### 7.2 Backend (`/backend/requirements.txt`)

| Package             | Pinned      | Notes                                                       |
| ------------------- | ----------- | ----------------------------------------------------------- |
| `fastapi`           | `==0.115.8` | API layer between Next.js and Supabase / external services. |
| `uvicorn[standard]` | `==0.34.0`  | ASGI server.                                                |
| `boto3`             | `==1.35.99` | AWS SDK (e.g., Bedrock or S3 hooks).                        |
| `python-dotenv`     | `==1.0.1`   | Local env loading.                                          |

### 7.3 Decisions on Record

- **AI SDK v6 over v5:** v6 is the current npm `latest` stable. A fresh hackathon codebase has no migration debt, so we start on v6. Do not introduce v5 patterns from older blog posts.
- **Supabase over Prisma + raw Postgres:** Realtime WebSockets ship the `/mobile-mock` push notification flow with zero extra infra. ACID atomic transactions for escrow lock/release are first-class.
- **Tailwind v4 over v3:** v4's CSS-first config is faster to iterate on under demo pressure. No `tailwind.config.js` to maintain.
- **No blockchain.** Web2 only. PostgreSQL row updates inside a transaction _are_ the escrow.
