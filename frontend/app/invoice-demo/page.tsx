"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  MessageSquareText,
  RefreshCcw,
  Send,
  Smartphone,
} from "lucide-react";
import {
  ApiError,
  createInvoiceDraft,
  reviseInvoiceDraft,
  type InvoiceDraft,
  type InvoiceItem,
} from "@/lib/api";
import { publish } from "@/lib/demo-bus";

const ACTIVE_INVOICE_KEY = "think-n-go-active-invoice";

const starterPrompt =
  "Create an invoice from Hartono Manufacturing to Ahmad bin Yusof for 10 cartons of cooking oil at RM125 each, 6 bags of rice at RM82.50 each, and 24 canned drinks at RM3.20 each. Use Net-14 terms, TNG escrow payment, and same-day dispatch after escrow lock.";

const defaultContext = {
  default_supplier_name: "Hartono Manufacturing",
  default_receiver_name: "Ahmad bin Yusof",
  currency: "MYR",
};

function formatRm(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(value)
    .replace("MYR", "RM");
}

function lineTotal(item: InvoiceItem) {
  return item.quantity * item.unit_price;
}

function persistAndSyncDraft(draft: InvoiceDraft) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACTIVE_INVOICE_KEY, JSON.stringify(draft));
  }
  publish({ type: "invoice:draft-updated", payload: draft });
}

function recalculateDraft(draft: InvoiceDraft): InvoiceDraft {
  const subtotal = Number(
    draft.items.reduce((sum, item) => sum + lineTotal(item), 0).toFixed(2)
  );
  const total = Number(
    (subtotal + draft.tax_rm + draft.shipping_rm + draft.adjustment_rm).toFixed(2)
  );
  const safeTotal = Math.max(0, total);
  return {
    ...draft,
    subtotal,
    total: safeTotal,
    principal_amount: safeTotal,
  };
}

function emptyDraft(): InvoiceDraft {
  return {
    invoice_num: "INV-TNG-DRAFT",
    invoice_ref: "PENDING",
    issue_date: "2026-04-26",
    currency: "MYR",
    supplier: {
      name: "Hartono Manufacturing",
      phone: "+60 3-2201 8840",
      location: "Kuala Lumpur, Malaysia",
      tax_id: null,
    },
    receiver: {
      name: "Ahmad bin Yusof",
      phone: "+60 12-345 6789",
      location: "Selangor, Malaysia",
      tax_id: null,
    },
    items: [
      { product_name: "Cooking oil cartons", quantity: 10, unit_price: 125 },
      { product_name: "Rice bags", quantity: 6, unit_price: 82.5 },
      { product_name: "Canned drinks", quantity: 24, unit_price: 3.2 },
    ],
    subtotal: 1821.8,
    tax_rm: 0,
    shipping_rm: 0,
    adjustment_rm: 0,
    total: 1821.8,
    principal_amount: 1821.8,
    terms: {
      net_days: "Net-14",
      due_date: "2026-05-10",
      payment_method: "TNG escrow",
      delivery_terms: "Same-day dispatch after escrow lock",
      late_fee_note: null,
    },
    description: "Pre-contract commercial invoice for merchant supply purchase.",
    notes: "Generated draft. Review item details and terms before locking escrow.",
    status: "draft",
  };
}

export default function InvoiceDemoPage() {
  const [draft, setDraft] = useState<InvoiceDraft>(() => emptyDraft());
  const [prompt, setPrompt] = useState(starterPrompt);
  const [instruction, setInstruction] = useState(
    "Change the terms to Net-21 and add a note that delivery is released after escrow is locked."
  );
  const [history, setHistory] = useState<string[]>(["Starter draft loaded locally."]);
  const [loading, setLoading] = useState<"draft" | "revise" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  const computedSubtotal = useMemo(
    () => draft.items.reduce((sum, item) => sum + lineTotal(item), 0),
    [draft.items]
  );
  const computedTotal = useMemo(
    () => computedSubtotal + draft.tax_rm + draft.shipping_rm + draft.adjustment_rm,
    [computedSubtotal, draft.adjustment_rm, draft.shipping_rm, draft.tax_rm]
  );

  function syncDraft(nextDraft = draft) {
    persistAndSyncDraft(nextDraft);
    setSyncedAt(new Date().toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" }));
  }

  function updateDraft(updater: (current: InvoiceDraft) => InvoiceDraft) {
    setDraft((current) => recalculateDraft(updater(current)));
  }

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    syncDraft(draft);
  }, [draft, hasMounted]);

  async function handleCreateDraft() {
    setLoading("draft");
    setError(null);
    try {
      const response = await createInvoiceDraft(prompt, defaultContext);
      setDraft(recalculateDraft(response.draft));
      setHistory((prev) => ["Generated draft from prompt.", ...prev].slice(0, 5));
    } catch (createError) {
      setError(
        createError instanceof ApiError
          ? createError.message
          : "Unable to generate invoice draft right now."
      );
    } finally {
      setLoading(null);
    }
  }

  async function handleReviseDraft() {
    if (!instruction.trim()) return;
    setLoading("revise");
    setError(null);
    try {
      const response = await reviseInvoiceDraft(draft, instruction);
      setDraft(recalculateDraft(response.draft));
      setHistory((prev) => [`Revised: ${instruction}`, ...prev].slice(0, 5));
      setInstruction("");
    } catch (reviseError) {
      setError(
        reviseError instanceof ApiError
          ? reviseError.message
          : "Unable to revise invoice draft right now."
      );
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#eef2f5] text-ink">
      <div className="border-b border-stroke-soft bg-paper px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-tng-blue">
              Supplier workspace
            </p>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              Invoice drafting desk
            </h1>
          </div>
          <nav className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
            <Link href="/dashboard" className="hover:text-ink">
              Dashboard
            </Link>
            <Link href="/mobile-mock" className="hover:text-ink">
              Merchant Demo
            </Link>
          </nav>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="min-w-0"
        >
          <InvoicePaper
            draft={draft}
            computedSubtotal={computedSubtotal}
            computedTotal={computedTotal}
            onChange={updateDraft}
          />
        </motion.section>

        <aside className="flex flex-col gap-4">
          <section className="border border-stroke-soft bg-card p-5">
            <div className="flex items-center gap-2">
              <MessageSquareText className="size-4 text-tng-blue" />
              <h2 className="text-sm font-semibold">Assistant instruction</h2>
            </div>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className="mt-4 min-h-36 w-full resize-none rounded-lg border border-stroke-soft bg-white p-3 text-sm outline-none focus:border-tng-blue"
            />
            <button
              type="button"
              onClick={handleCreateDraft}
              disabled={loading !== null || !prompt.trim()}
              className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-full bg-tng-blue px-4 text-sm font-semibold text-white transition-colors hover:bg-tng-blue-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading === "draft" ? (
                <>
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                  Drafting
                </>
              ) : (
                <>
                  Generate invoice
                  <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </button>
          </section>

          <section className="border border-stroke-soft bg-card p-5">
            <div className="flex items-center gap-2">
              <RefreshCcw className="size-4 text-tng-blue" />
              <h2 className="text-sm font-semibold">Revise current draft</h2>
            </div>
            <textarea
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              className="mt-4 min-h-28 w-full resize-none rounded-lg border border-stroke-soft bg-white p-3 text-sm outline-none focus:border-tng-blue"
              placeholder="Ask the assistant to change terms, items, notes, supplier details, or receiver details."
            />
            <button
              type="button"
              onClick={handleReviseDraft}
              disabled={loading !== null || !instruction.trim()}
              className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-tng-blue-deep disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading === "revise" ? (
                <>
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                  Revising
                </>
              ) : (
                <>
                  Apply revision
                  <Send className="ml-2 size-4" />
                </>
              )}
            </button>
          </section>

          <section className="border border-stroke-soft bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Smartphone className="size-4 text-tng-blue" />
                <h2 className="text-sm font-semibold">Mobile sync</h2>
              </div>
              {syncedAt ? <CheckCircle2 className="size-4 text-up" /> : null}
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Every document edit is automatically broadcast to the merchant scan and contract
              screens with supplier, invoice number, amount, and terms.
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {syncedAt ? `Auto-synced ${syncedAt}` : "Auto-sync will begin after the page loads."}
            </p>
          </section>

          {error ? (
            <div className="border border-tng-red bg-white p-4 text-sm text-tng-red">{error}</div>
          ) : null}

          <section className="border border-stroke-soft bg-card p-5">
            <h2 className="text-sm font-semibold">Revision history</h2>
            <div className="mt-3 space-y-2">
              {history.map((entry, index) => (
                <p key={`${entry}-${index}`} className="text-xs leading-5 text-muted-foreground">
                  {entry}
                </p>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function InvoicePaper({
  draft,
  computedSubtotal,
  computedTotal,
  onChange,
}: {
  draft: InvoiceDraft;
  computedSubtotal: number;
  computedTotal: number;
  onChange: (updater: (current: InvoiceDraft) => InvoiceDraft) => void;
}) {
  function update<K extends keyof InvoiceDraft>(key: K, value: InvoiceDraft[K]) {
    onChange((current) => ({ ...current, [key]: value }));
  }

  function updateSupplier(key: keyof InvoiceDraft["supplier"], value: string | null) {
    onChange((current) => ({
      ...current,
      supplier: { ...current.supplier, [key]: value },
    }));
  }

  function updateReceiver(key: keyof InvoiceDraft["receiver"], value: string | null) {
    onChange((current) => ({
      ...current,
      receiver: { ...current.receiver, [key]: value },
    }));
  }

  function updateTerms(key: keyof InvoiceDraft["terms"], value: string | null) {
    onChange((current) => ({
      ...current,
      terms: { ...current.terms, [key]: value },
    }));
  }

  function updateItem(index: number, patch: Partial<InvoiceItem>) {
    onChange((current) => ({
      ...current,
      items: current.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  }

  return (
    <div className="mx-auto min-h-[1120px] max-w-[920px] bg-white px-12 py-12 shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
      <header className="flex items-start justify-between border-b-2 border-ink pb-8">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold italic">
              <span>Think</span>
              <span className="text-tng-yellow">&apos;n </span>
              <span className="text-tng-blue">Go</span>
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              escrow ready invoice
            </span>
          </div>
          <EditableTextarea
            value={draft.description || ""}
            placeholder="Commercial invoice prepared for review before escrow funding."
            className="mt-5 min-h-16 max-w-md text-sm leading-6 text-muted-foreground"
            onChange={(value) => update("description", value || null)}
          />
        </div>
        <div className="text-right">
          <h2 className="font-display text-5xl font-bold tracking-tight">Invoice</h2>
          <EditableInput
            value={draft.invoice_num}
            className="mt-3 text-right font-mono text-sm uppercase tracking-[0.08em] text-muted-foreground"
            onChange={(value) => update("invoice_num", value)}
          />
          <div className="mt-1 flex items-center justify-end gap-1 font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
            <span>Ref</span>
            <EditableInput
              value={draft.invoice_ref || ""}
              placeholder="Optional"
              className="w-36 text-right"
              onChange={(value) => update("invoice_ref", value || null)}
            />
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-10 border-b border-stroke-soft py-8">
        <PartyBlock title="Bill from" party={draft.supplier} onChange={updateSupplier} />
        <PartyBlock title="Bill to" party={draft.receiver} onChange={updateReceiver} />
      </section>

      <section className="grid grid-cols-4 gap-4 border-b border-stroke-soft py-6">
        <Meta label="Issue date">
          <EditableInput value={draft.issue_date} onChange={(value) => update("issue_date", value)} />
        </Meta>
        <Meta label="Due date">
          <EditableInput
            value={draft.terms.due_date || ""}
            placeholder="To confirm"
            onChange={(value) => updateTerms("due_date", value || null)}
          />
        </Meta>
        <Meta label="Terms">
          <EditableInput value={draft.terms.net_days} onChange={(value) => updateTerms("net_days", value)} />
        </Meta>
        <Meta label="Payment">
          <EditableInput
            value={draft.terms.payment_method}
            onChange={(value) => updateTerms("payment_method", value)}
          />
        </Meta>
      </section>

      <section className="py-8">
        <table className="w-full text-left">
          <thead className="border-b border-ink text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
            <tr>
              <th className="py-3">Item</th>
              <th className="py-3 text-right">Qty</th>
              <th className="py-3 text-right">Unit</th>
              <th className="py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {draft.items.map((item, index) => (
              <tr key={`${item.product_name}-${index}`} className="border-b border-stroke-soft">
                <td className="py-4 pr-4">
                  <EditableInput
                    value={item.product_name}
                    className="w-full font-medium text-ink"
                    onChange={(value) => updateItem(index, { product_name: value })}
                  />
                </td>
                <td className="py-4 text-right tabular-nums">
                  <EditableNumber
                    value={item.quantity}
                    className="w-20 text-right"
                    onChange={(value) => updateItem(index, { quantity: value })}
                  />
                </td>
                <td className="py-4 text-right tabular-nums">
                  <EditableNumber
                    value={item.unit_price}
                    className="w-24 text-right"
                    onChange={(value) => updateItem(index, { unit_price: value })}
                  />
                </td>
                <td className="py-4 text-right font-semibold tabular-nums">
                  {formatRm(lineTotal(item))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid grid-cols-[1fr_320px] gap-8 border-t border-stroke-soft pt-6">
        <div className="text-sm leading-6 text-muted-foreground">
          <p className="font-semibold uppercase tracking-[0.08em] text-ink">Terms and notes</p>
          <EditableTextarea
            value={draft.terms.delivery_terms || ""}
            placeholder="Delivery terms to be confirmed."
            className="mt-3 min-h-12"
            onChange={(value) => updateTerms("delivery_terms", value || null)}
          />
          <EditableTextarea
            value={draft.terms.late_fee_note || ""}
            placeholder="Late fee note"
            className="mt-2 min-h-10"
            onChange={(value) => updateTerms("late_fee_note", value || null)}
          />
          <EditableTextarea
            value={draft.notes || ""}
            placeholder="Additional notes"
            className="mt-2 min-h-12"
            onChange={(value) => update("notes", value || null)}
          />
        </div>

        <div className="space-y-3 text-sm">
          <TotalRow label="Subtotal" value={computedSubtotal} />
          <EditableTotalRow label="Tax" value={draft.tax_rm} onChange={(value) => update("tax_rm", value)} />
          <EditableTotalRow label="Shipping" value={draft.shipping_rm} onChange={(value) => update("shipping_rm", value)} />
          <EditableTotalRow label="Adjustment" value={draft.adjustment_rm} onChange={(value) => update("adjustment_rm", value)} />
          <div className="border-t-2 border-ink pt-4">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold uppercase tracking-[0.08em]">Total due</span>
              <span className="font-display text-3xl font-bold">{formatRm(computedTotal)}</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-14 grid grid-cols-2 gap-10 border-t border-stroke-soft pt-8 text-sm text-muted-foreground">
        <div>
          <p className="font-semibold uppercase tracking-[0.08em] text-ink">Supplier acknowledgement</p>
          <div className="mt-10 border-t border-ink pt-2">Authorized signature</div>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-[0.08em] text-ink">Escrow compatibility</p>
          <p className="mt-3 leading-6">
            Principal amount maps to {formatRm(draft.principal_amount)} for later contract
            proposal, funding, and merchant review.
          </p>
        </div>
      </footer>
    </div>
  );
}

function PartyBlock({
  title,
  party,
  onChange,
}: {
  title: string;
  party: InvoiceDraft["supplier"];
  onChange: (key: keyof InvoiceDraft["supplier"], value: string | null) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {title}
      </p>
      <EditableInput
        value={party.name}
        className="mt-3 w-full font-display text-xl font-bold"
        onChange={(value) => onChange("name", value)}
      />
      <EditableInput
        value={party.location || ""}
        placeholder="Location"
        className="mt-2 w-full text-sm text-muted-foreground"
        onChange={(value) => onChange("location", value || null)}
      />
      <EditableInput
        value={party.phone || ""}
        placeholder="Phone"
        className="mt-1 w-full text-sm text-muted-foreground"
        onChange={(value) => onChange("phone", value || null)}
      />
      <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
        <span>Tax ID</span>
        <EditableInput
          value={party.tax_id || ""}
          placeholder="Optional"
          className="flex-1"
          onChange={(value) => onChange("tax_id", value || null)}
        />
      </div>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 text-sm font-semibold text-ink">{children}</div>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{formatRm(value)}</span>
    </div>
  );
}

function EditableTotalRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <EditableNumber
        value={value}
        className="w-28 text-right font-medium tabular-nums"
        onChange={onChange}
      />
    </div>
  );
}

function EditableInput({
  value,
  placeholder,
  className = "",
  onChange,
}: {
  value: string;
  placeholder?: string;
  className?: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={`min-w-0 rounded-sm border border-transparent bg-transparent px-1 py-0.5 outline-none transition-colors placeholder:text-muted-foreground/60 hover:border-stroke-soft focus:border-tng-blue focus:bg-paper ${className}`}
    />
  );
}

function EditableTextarea({
  value,
  placeholder,
  className = "",
  onChange,
}: {
  value: string;
  placeholder?: string;
  className?: string;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={`w-full resize-none rounded-sm border border-transparent bg-transparent px-1 py-0.5 outline-none transition-colors placeholder:text-muted-foreground/60 hover:border-stroke-soft focus:border-tng-blue focus:bg-paper ${className}`}
    />
  );
}

function EditableNumber({
  value,
  className = "",
  onChange,
}: {
  value: number;
  className?: string;
  onChange: (value: number) => void;
}) {
  return (
    <input
      type="number"
      step="0.01"
      value={Number.isFinite(value) ? value : 0}
      onChange={(event) => onChange(Number(event.target.value || 0))}
      className={`min-w-0 rounded-sm border border-transparent bg-transparent px-1 py-0.5 outline-none transition-colors hover:border-stroke-soft focus:border-tng-blue focus:bg-paper ${className}`}
    />
  );
}
