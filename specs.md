# Product Specification: Think 'n Go (Agentic Supply Chain & Liquidity Engine)

## 1. Hackathon Context & Development Philosophy
* **Event:** TNG Digital Finhack 2026 (Innovation Track).
* **Optimization Goal:** Prioritize rapid feature shipping, "Vibe Coding" workflows, and high-impact visual demos over tight security testing or extensive unit tests.
* **Aesthetic Constraint:** "Management Consulting" visual hierarchy (McKinsey/BCG style). High data-ink ratio, stark contrasts, professional typography. No cluttered or generic "AI chatbot" wrappers.

## 2. Core Problem & Economic Context (Malaysia 2026)
The Malaysian Micro-SME (MSME) B2B supply chain is paralyzed by a severe liquidity trap:
* **The Corporate Delay:** Large corporate clients delay payments to MSMEs by an average of **64 days** (Experian 2025).
* **The Wholesale Friction:** Upstream wholesalers operate on **Net-14 to Net-30 day** trade credit. However, because MSMEs are starved of cash by corporates, they cannot pay wholesalers on time. 
* **The Micro-SME Growth Ceiling:** Micro-merchants (e.g., food stalls) lack the upfront cash to buy bulk inventory for peak/festive seasons and are excluded from traditional bank loans due to a lack of formal CCRIS credit histories.

## 3. Solution Architecture
We are deploying an Agentic Parametric Web2 Escrow to act as an autonomous financial operating system between the Wholesaler and the MSME. (Note: This strictly uses Web2 APIs and PostgreSQL, **not** blockchain smart contracts).

### 3.1 The Merchant Side (Agentic CFO)
* **Predictive Growth:** The AI analyzes the merchant's historical DuitNow QR sales and upcoming seasonal trends. It proactively alerts the merchant: *"Predictive demand indicates you will sell out in 3 days. Recommend 2x bulk order. You are RM 500 short."*
* **Automated BNPL & Funding:** If the merchant approves, the AI instantly funds the RM 500 shortfall via a fractional TNG BNPL micro-loan. 
* **Escrow & Yield:** The total payment is locked into a TNG GO+ Escrow. The AI dashboard shows the merchant exactly how much daily interest they are earning in TNG versus traditional banks while the funds sit in escrow.
* **Frictionless Repayment:** TNG automatically deducts a small fraction (e.g., 5%) from the merchant's daily incoming DuitNow QR customer payments to settle the BNPL line seamlessly.

### 3.2 The Wholesaler Side (Instant Liquidity Broker)
* **Privacy-Preserving Insights:** The Wholesaler's AI analyzes their MSME clients' financial health using TNG's internal alternative data (GO+ balances, QR velocity) *without* exposing raw data to the wholesaler.
* **The "Instant Liquidity" Trigger:** When the wholesaler needs cash to pay their own suppliers, they click one button. Their AI autonomously sends targeted offers strictly to healthy MSMEs: *"Take a 2% discount to release your escrow payment today instead of waiting 14 days."* * **Automated Settlement:** If the MSME's AI calculates the arbitrage is favorable, the escrow is instantly released, liquidating the wholesaler's receivables on demand.

## 4. UI/UX Specifications (Generative UI)
* **The Unified Dashboard:** A multi-pane layout featuring real-time financial states.
* **Merchant View:** Focus on "Active Treasury" (Escrow balances, GO+ daily yield generation) and predictive restock alerts.
* **Wholesaler View:** Focus on the logistics pipeline, locked escrow totals, and the "Generate Instant Liquidity" single-click action.
* **Agentic Orchestration:** AI tool-calling must be visible. Use rich generative UI components (not just text) to show the AI executing API calls, locking escrows, and calculating yield arbitrage.

## 5. Technical Stack (Optimized for Rapid AI-Assisted Development)
* **Framework:** Next.js 16 (App Router, Turbopack)
* **AI Orchestration:** Vercel AI SDK (utilizing advanced `tool()` functions, structured JSON outputs, and React Server Components for streaming generative UI).
* **Database (Strict ACID Ledger):** Supabase (PostgreSQL). Essential for atomic double-entry accounting (Escrow locks/releases) and Realtime WebSockets for instant UI updates.
* **Component Libraries:**
    * **shadcn/ui:** For core, accessible, unstyled baseline components.
    * **Kokonut UI & 21st.dev:** For modern, animated, copy-paste AI generative components (e.g., animated prompt boxes, dynamic status nodes) to elevate the demo quality.
* **Data Strategy:** Use intelligent mocking for external APIs (like logistics tracking), but use a live Supabase instance to prove the backend ledger updates are real.
