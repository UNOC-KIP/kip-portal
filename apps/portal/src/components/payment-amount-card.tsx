interface PaymentAmountCardProps {
  label?: string;
  ugxRate?: string;
  note?: string;
}

export function PaymentAmountCard({
  label = "APPLICATION FEE",
  ugxRate = "≈ UGX 3,680,000",
  note = "Non-refundable · One-time payment per application",
}: PaymentAmountCardProps) {
  return (
    <div
      className="flex items-center justify-between rounded-xl px-6 py-5 text-white"
      style={{ backgroundColor: "#5C5418" }}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-white/60">{label}</p>
        <p className="mt-1 text-3xl font-black">USD 1,000</p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-white/90">{ugxRate}</p>
        <p className="mt-0.5 text-xs text-white/60">{note}</p>
      </div>
    </div>
  );
}
