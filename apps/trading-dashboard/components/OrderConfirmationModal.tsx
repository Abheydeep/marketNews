"use client";

import { AlertTriangle, Check, X } from "lucide-react";
import { confirmOrder } from "../lib/api";
import { useMarketStore } from "../store/marketStore";

export function OrderConfirmationModal() {
  const proposal = useMarketStore((state) => state.pendingProposal);
  const setPendingProposal = useMarketStore((state) => state.setPendingProposal);
  const token = useMarketStore((state) => state.token);

  if (!proposal) {
    return null;
  }

  async function confirm() {
    if (!proposal || !token) {
      return;
    }
    const result = await confirmOrder(proposal.proposal_id, token);
    setPendingProposal({ ...proposal, status: result.status, reasons: result.reasons });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/80 px-4">
      <section className="widget w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber" aria-hidden="true" />
            <h2 className="text-base font-black text-white">Manual Order Confirmation</h2>
          </div>
          <button onClick={() => setPendingProposal(null)} className="rounded-md border border-line p-2 text-slate-300">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="grid gap-3 p-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Symbol" value={proposal.tradingsymbol} />
            <Field label="Qty" value={String(proposal.quantity)} />
            <Field label="Order" value={`${proposal.transaction_type} ${proposal.order_type}`} />
            <Field label="Limit" value={proposal.limit_price.toFixed(2)} />
            <Field label="Target" value={proposal.target_price?.toFixed(2) ?? "-"} />
            <Field label="Stop" value={proposal.stop_loss?.toFixed(2) ?? "-"} />
          </div>
          <div className="rounded-md border border-line bg-ink p-3 text-xs leading-5 text-slate-300">
            {proposal.reasons.slice(0, 4).map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
          </div>
          {proposal.status === "BLOCKED" ? <p className="rounded-md border border-loss/60 bg-loss/10 p-3 text-xs text-red-100">{proposal.reasons.join(" | ")}</p> : null}
          {proposal.status === "PLACED" ? <p className="rounded-md border border-gain/60 bg-gain/10 p-3 text-xs text-green-100">Order placed.</p> : null}
          <button
            disabled={proposal.status === "PLACED"}
            onClick={() => void confirm()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-cyan px-3 font-black text-ink"
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Confirm Live Order
          </button>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-panelSoft p-2">
      <div className="text-[10px] font-bold uppercase text-slate-500">{label}</div>
      <div className="mt-1 truncate font-black text-white">{value}</div>
    </div>
  );
}
