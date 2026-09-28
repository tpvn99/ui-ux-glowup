/**
 * Pattern: dashboard (same look as ../dashboard-shell.html) split into React components.
 * Stack: React 18+ · TypeScript · Tailwind v4 · lucide-react
 * Key points: data separated from rendering, small typed components (Sidebar, Kpi, StatusBadge, OrdersTable),
 * variants via a mapping object (no nested ternaries), locale-aware formatting via Intl.
 * Tailwind: define --color-accent and --color-line in @theme (see the HTML examples).
 */
import { useState } from "react";
import { Home, ShoppingBag, Package, User, BarChart3, Clock, Search, ChevronsUpDown } from "lucide-react";

// ---------- Data (replace with your API) ----------
type Status = "todo" | "shipped" | "delivered" | "refunded";
type Order = { id: string; customer: string; status: Status; date: Date; amount: number };

const orders: Order[] = [
  { id: "20417", customer: "Mark Duran", status: "todo", date: new Date("2026-09-28T09:41"), amount: 189 },
  { id: "20416", customer: "Sophie Nguyen", status: "shipped", date: new Date("2026-09-27T18:02"), amount: 1240 },
  { id: "20415", customer: "The Lakeview Hotel", status: "delivered", date: new Date("2026-09-27T11:26"), amount: 3870 },
  { id: "20414", customer: "Julian Pitt", status: "refunded", date: new Date("2026-09-26T16:50"), amount: 74.9 },
  { id: "20413", customer: "Camille Ross", status: "delivered", date: new Date("2026-09-26T10:15"), amount: 412.5 },
];

const kpis = [
  { label: "Revenue", value: 48920, format: "currency", delta: 12.4 },
  { label: "Orders", value: 312, format: "number", delta: 8.1 },
  { label: "Average order", value: 156.79, format: "currency", delta: -2.3 },
  { label: "Return rate", value: 0.018, format: "percent", delta: 0 },
] as const;

// ---------- Utilities ----------
const LOCALE = "en-US";
const eur = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR" });
const fmt = {
  currency: (v: number) => eur.format(v),
  number: (v: number) => new Intl.NumberFormat(LOCALE).format(v),
  percent: (v: number) => new Intl.NumberFormat(LOCALE, { style: "percent", maximumFractionDigits: 1 }).format(v),
};
const dateFmt = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

// ---------- Components ----------
const statusStyles: Record<Status, { label: string; badge: string; dot: string }> = {
  todo: { label: "To pack", badge: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  shipped: { label: "Shipped", badge: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  delivered: { label: "Delivered", badge: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  refunded: { label: "Refunded", badge: "bg-zinc-100 text-zinc-600", dot: "bg-zinc-400" },
};

function StatusBadge({ status }: { status: Status }) {
  const s = statusStyles[status];
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12.5px] font-medium", s.badge)}>
      <span className={cx("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

function Kpi({ label, value, format, delta }: (typeof kpis)[number]) {
  return (
    <div className="p-5">
      <p className="text-[13px] text-zinc-500">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">{fmt[format](value)}</p>
      <p className={cx("mt-1 text-[13px]", delta > 0 && "text-emerald-600", delta < 0 && "text-rose-600", delta === 0 && "text-zinc-500")}>
        {delta === 0 ? "Flat" : <>{delta > 0 ? "↑" : "↓"} {fmt.number(Math.abs(delta))}% <span className="text-zinc-400">vs last month</span></>}
      </p>
    </div>
  );
}

const nav = [
  { label: "Home", icon: Home },
  { label: "Orders", icon: ShoppingBag, count: 12, active: true },
  { label: "Products", icon: Package },
  { label: "Customers", icon: User },
];
const navAnalyse = [
  { label: "Reports", icon: BarChart3 },
  { label: "Activity", icon: Clock },
];

function NavItem({ label, icon: Icon, count, active }: { label: string; icon: typeof Home; count?: number; active?: boolean }) {
  return (
    <li>
      <a
        href="#"
        aria-current={active ? "page" : undefined}
        className={cx(
          "flex items-center gap-2.5 rounded-md px-2 py-1.5",
          active ? "bg-white font-medium text-zinc-950 shadow-[0_1px_2px_rgb(0_0_0/.06)] ring-1 ring-line" : "hover:bg-zinc-200/60"
        )}
      >
        <Icon className="size-4" strokeWidth={1.5} aria-hidden />
        {label}
        {count != null && <span className="ml-auto rounded bg-zinc-100 px-1.5 text-[11px] tabular-nums text-zinc-600">{count}</span>}
      </a>
    </li>
  );
}

function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-zinc-50 lg:flex">
      <button className="m-3 flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-zinc-200/60">
        <span className="grid size-6 place-items-center rounded-md bg-zinc-950 text-[11px] font-semibold text-white">A</span>
        <span className="flex-1 font-medium">Oak & Linen Studio</span>
        <ChevronsUpDown className="size-4 text-zinc-400" aria-hidden />
      </button>
      <nav className="flex-1 space-y-6 px-3 text-[13.5px]" aria-label="Main navigation">
        <ul className="space-y-0.5 text-zinc-600">{nav.map((n) => <NavItem key={n.label} {...n} />)}</ul>
        <div>
          <p className="px-2 pb-1.5 text-[11.5px] font-medium text-zinc-400">Analytics</p>
          <ul className="space-y-0.5 text-zinc-600">{navAnalyse.map((n) => <NavItem key={n.label} {...n} />)}</ul>
        </div>
      </nav>
    </aside>
  );
}

const filters: { key: Status | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "todo", label: "To pack" },
  { key: "shipped", label: "Shipped" },
  { key: "refunded", label: "Refunded" },
];

function OrdersTable() {
  const [filter, setFilter] = useState<Status | "all">("all");
  const rows = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <section className="mt-8 overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3" role="tablist">
        {filters.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={cx(
              "rounded-full px-3 py-1 text-[13px] transition",
              filter === f.key ? "bg-zinc-950 font-medium text-white" : "text-zinc-600 ring-1 ring-line hover:bg-zinc-50"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="font-medium">No orders</p>
          <p className="mt-1 text-zinc-500">No orders match this filter for the period.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left">
            <thead className="text-[12.5px] text-zinc-500">
              <tr className="border-b border-line">
                <th className="px-4 py-2.5 font-medium">Order</th>
                <th className="px-4 py-2.5 font-medium">Customer</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium tabular-nums">#{o.id}</td>
                  <td className="px-4 py-3">{o.customer}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 tabular-nums text-zinc-500">{dateFmt.format(o.date)}</td>
                  <td className={cx("px-4 py-3 text-right tabular-nums", o.status === "refunded" && "text-zinc-400 line-through")}>
                    {eur.format(o.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ---------- Page ----------
export default function DashboardShell() {
  return (
    <div className="flex min-h-screen bg-zinc-50 text-[14px] text-zinc-950">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-line bg-zinc-50/80 px-6 backdrop-blur">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13.5px] text-zinc-500">
            <a href="#" className="hover:text-zinc-950">Store</a>
            <span aria-hidden>/</span>
            <span className="font-medium text-zinc-950">Orders</span>
          </nav>
          <button className="ml-auto flex h-8 w-64 items-center gap-2 rounded-md border border-line bg-white px-2.5 text-[13px] text-zinc-400 max-sm:w-auto">
            <Search className="size-4" aria-hidden />
            <span className="max-sm:hidden">Search…</span>
            <kbd className="ml-auto rounded border border-line px-1.5 font-sans text-[11px] text-zinc-500 max-sm:hidden">⌘K</kbd>
          </button>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.02em]">Orders</h1>
              <p className="mt-1 text-zinc-500">Orders from the last 30 days.</p>
            </div>
            <div className="flex gap-2">
              <button className="h-9 rounded-md border border-line bg-white px-3 font-medium hover:bg-zinc-50">Export</button>
              <button className="h-9 rounded-md bg-zinc-950 px-3 font-medium text-white hover:bg-zinc-800">New order</button>
            </div>
          </div>

          <section
            aria-label="Key metrics"
            className="mt-8 grid divide-line overflow-hidden rounded-xl border border-line bg-white max-lg:divide-y sm:grid-cols-2 lg:grid-cols-4 lg:divide-x"
          >
            {kpis.map((k) => <Kpi key={k.label} {...k} />)}
          </section>

          <OrdersTable />
        </main>
      </div>
    </div>
  );
}
