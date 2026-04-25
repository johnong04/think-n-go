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

## 4. UI/UX Specifications (The "Dual-Reality" Layout & Generative UI)

To effectively demonstrate a B2B two-sided marketplace alongside an AI layer, the UI utilizes a strictly managed, three-zone visual hierarchy on a single widescreen view. Do not build disconnected pages.

### 4.1 Zone 1: The Main Stage (Left - 60% Width)

This zone represents the human and business reality. It is split internally to show both the Desktop and Mobile context simultaneously:

- **The Desktop Dashboard:** Displays standard enterprise UI using `shadcn/ui` data tables. For the Wholesaler, it shows their client logistics pipeline and cash flow warnings. For the Merchant, it shows predictive analytics and treasury charts.
- **The Embedded Mobile Mockup:** Sitting next to the desktop view (but still inside the Left Stage) is a CSS-rendered smartphone UI (using Tailwind CSS mobile bezels). This permanently displays Ahmad's "TNG App" view.
- **The Interaction:** When the Wholesaler clicks a desktop button (e.g., "Offer Discount"), the Embedded Mobile Mockup instantly updates, showing a push notification and an "Accept" button on Ahmad's phone.

### 4.2 Zone 2: The Swarm Command Console (Right - 40% Width)

This zone acts as the transparent "brain" of the AI. It is strictly reserved for Agentic reasoning and tool-calling visualization.

- **No Chatbots:** Do not use a generic text chat interface.
- **Generative UI (React Server Components):** When the AI executes a task (e.g., underwriting a BNPL loan or calculating GO+ yield), the Vercel AI SDK streams dynamic, animated React components (built with Kokonut UI and 21st.dev) directly into this console.
- **Visualizing the Math:** Use interactive widgets here to explain the business logic to the judges. For example, render a dynamic slider showing how the 2% early-payment discount is mathematically superior to waiting 14 days for standard GO+ yield.

### 4.3 Design Constraints

- **Aesthetic:** "Management Consulting" clean. Use crisp White backgrounds, TNG Corporate Blue headers, and sparse Yellow accents exclusively for highlighting AI actions or critical financial metrics.
- **Mocking:** Use standard HTML/Tailwind CSS for the mobile device bezel. Use intelligent JSON mocking for external logistics triggers to protect the demo's "Golden Path."

## 5. Technical Stack (Optimized for Rapid AI-Assisted Development)

- **Framework:** Next.js 16 (App Router, Turbopack)
- **AI Orchestration:** Vercel AI SDK (utilizing advanced `tool()` functions, structured JSON outputs, and React Server Components for streaming generative UI).
- **Database (Strict ACID Ledger):** Supabase (PostgreSQL). Essential for atomic double-entry accounting (Escrow locks/releases) and Realtime WebSockets for instant UI updates.
- **Component Libraries:**
  - **shadcn/ui:** For core, accessible, unstyled baseline components.
  - **Kokonut UI & 21st.dev:** For modern, animated, copy-paste AI generative components (e.g., animated prompt boxes, dynamic status nodes) to elevate the demo quality.
- **Data Strategy:** Use intelligent mocking for external APIs (like logistics tracking), but use a live Supabase instance to prove the backend ledger updates are real.
