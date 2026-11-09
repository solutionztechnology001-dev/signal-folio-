import type { ElementType, ReactNode } from "react";
import { X } from "lucide-react";

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ElementType;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3.5 lg:p-5 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs lg:text-sm font-medium text-slate-500 leading-tight">{label}</span>
        <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 lg:w-5 lg:h-5 text-sky-600" />
        </div>
      </div>
      <div className="text-lg lg:text-2xl font-bold text-slate-900 tracking-tight break-words">{value}</div>
      {hint && <div className="text-xs mt-1.5 text-slate-500">{hint}</div>}
    </div>
  );
}

const TONES: Record<string, string> = {
  slate: "bg-slate-100 text-slate-600",
  green: "bg-green-100 text-green-700",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  violet: "bg-violet-100 text-violet-700",
};

export function Badge({ tone = "slate", children }: { tone?: string; children: ReactNode }) {
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${TONES[tone] ?? TONES.slate}`}>
      {children}
    </span>
  );
}

const BANNER_TONES: Record<string, string> = {
  info: "bg-sky-50 border-sky-200 text-sky-900",
  warn: "bg-amber-50 border-amber-200 text-amber-900",
  error: "bg-red-50 border-red-200 text-red-900",
};

export function Banner({
  tone = "info",
  children,
  actions,
  onDismiss,
}: {
  tone?: "info" | "warn" | "error";
  children: ReactNode;
  actions?: ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div className={`border rounded-lg px-3.5 py-3 text-sm flex items-start gap-3 ${BANNER_TONES[tone]}`}>
      <div className="flex-1 min-w-0">
        <div>{children}</div>
        {actions && <div className="mt-2 flex flex-wrap gap-2">{actions}</div>}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="p-1 -mr-1 shrink-0" aria-label="Dismiss">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function SmallButton({
  onClick,
  children,
  tone = "default",
  disabled,
  title,
}: {
  onClick: () => void;
  children: ReactNode;
  tone?: "default" | "primary" | "danger";
  disabled?: boolean;
  title?: string;
}) {
  const cls =
    tone === "primary"
      ? "bg-sky-600 hover:bg-sky-700 text-white"
      : tone === "danger"
      ? "bg-white hover:bg-red-50 text-red-700 border border-red-200"
      : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-3 py-1.5 text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${cls}`}
    >
      {children}
    </button>
  );
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:rounded-2xl sm:max-w-lg sm:mx-4 max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 sticky top-0 bg-white">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg" aria-label="Close">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-4 sm:p-6 space-y-4">{children}</div>
      </div>
    </div>
  );
}

export const inputCls =
  "w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500";
export const labelCls = "block text-sm font-medium text-slate-700 mb-1";

export function formatMoney(byCurrency: Record<string, number>): string {
  const parts = Object.keys(byCurrency)
    .sort()
    .map((cur) => `${cur} ${byCurrency[cur].toLocaleString("en-US", { maximumFractionDigits: 2 })}`);
  return parts.length > 0 ? parts.join(" · ") : "None entered";
}

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
