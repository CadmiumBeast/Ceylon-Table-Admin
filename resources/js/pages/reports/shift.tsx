// resources/js/Pages/Reports/Shift.tsx

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';

// ---------- Types ----------

interface ShiftSummary {
    id: number;
    opened_at: string;
    closed_at: string | null;
    status: 'open' | 'closed';
    opening_cash: number;
    closing_cash: number | null;
    opened_by?: { name: string } | null;
    closed_by?: { name: string } | null;
    notes?: string | null;
}

interface TotalSalesData {
    total_orders: number;
    gross_sales: number;
    total_discount: number;
    net_sales: number;
    cash: number;
    card: number;
    other: number;
    average_order_value: number;
}

interface CategoryRow { category: string; qty_sold: number; revenue: number; }
interface TableRow { table: string; orders: number; total_sales: number; }
interface ItemRow { item_name: string; qty_sold: number; revenue: number; }
interface HourlyRow { hour: string; orders: number; total_sales: number; }
interface DiscountOrderRow { order_number: string; table: string | null; subtotal: number; discount: number; total: number; }
interface DiscountData { total_discount_given: number; discounted_orders_count: number; orders: DiscountOrderRow[]; }
interface OrderRow {
    order_number: string;
    time: string;
    order_type: string;
    table: string | null;
    items_count: number;
    subtotal: number;
    discount: number;
    total: number;
    payment_method: string | null;
}

type ReportType = 'total' | 'category' | 'discount' | 'table' | 'item' | 'order' | 'hourly';

const REPORT_TYPES: { key: ReportType; label: string }[] = [
    { key: 'total', label: 'Total Sales' },
    { key: 'category', label: 'Category Wise' },
    { key: 'discount', label: 'Discount Wise' },
    { key: 'table', label: 'Table Wise' },
    { key: 'item', label: 'Item Wise' },
    { key: 'order', label: 'Order Wise' },
    { key: 'hourly', label: 'Hourly Sales' },
];

interface Props {
    currentShift: ShiftSummary | null;
    shifts: ShiftSummary[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reports', href: '/reports/shift' },
];

// ---------- Helpers ----------

const money = (n: number) =>
    `Rs. ${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDisplay = (value: string | null) =>
    value
        ? new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        : '—';

const duration = (start: string, end: string | null) => {
    const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
    const hrs = Math.floor(ms / 3_600_000);
    const mins = Math.floor((ms % 3_600_000) / 60_000);
    return `${hrs}h ${mins}m`;
};

const paymentVariant = (method: string | null): 'secondary' | 'default' | 'outline' => {
    if (method === 'cash') return 'secondary';
    if (method === 'card') return 'default';
    return 'outline';
};

// ---------- Component ----------

export default function ShiftReport({ currentShift, shifts }: Props) {
    const [selectedShiftId, setSelectedShiftId] = useState<number | undefined>(
        currentShift?.id ?? shifts[0]?.id
    );
    const [activeType, setActiveType] = useState<ReportType | null>(null);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [showOpenForm, setShowOpenForm] = useState(false);
    const [showCloseForm, setShowCloseForm] = useState(false);
    const [openingCash, setOpeningCash] = useState('');
    const [closingCash, setClosingCash] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const selectedShift = shifts.find(s => s.id === selectedShiftId) ?? currentShift;

    useEffect(() => {
        if (selectedShiftId) fetchReport(activeType ?? 'total');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedShiftId]);

    const fetchReport = async (type: ReportType) => {
        if (!selectedShiftId) return;
        setLoading(true);
        setError(null);
        setActiveType(type);
        try {
            const res = await axios.get('/reports/shift/data', {
                params: { shift_id: selectedShiftId, type },
            });
            setData(res.data.data);
        } catch {
            setError('Could not load this report. Try again.');
        } finally {
            setLoading(false);
        }
    };

    const openShift = () => {
        setSubmitting(true);
        router.post(
            '/shifts/open',
            { opening_cash: openingCash || 0, notes },
            {
                onFinish: () => setSubmitting(false),
                onSuccess: () => {
                    setShowOpenForm(false);
                    setOpeningCash('');
                    setNotes('');
                },
            }
        );
    };

    const closeShift = () => {
        setSubmitting(true);
        router.post(
            '/shifts/close',
            { closing_cash: closingCash || 0, notes },
            {
                onFinish: () => setSubmitting(false),
                onSuccess: () => {
                    setShowCloseForm(false);
                    setClosingCash('');
                    setNotes('');
                },
            }
        );
    };

    const printReport = () => {
        if (!activeType || !selectedShiftId) return;
        window.open(
            `/reports/shift/print?shift_id=${selectedShiftId}&type=${activeType}`,
            '_blank'
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Shift Reports" />

            <div className="space-y-6 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Shift Reports</h1>
                    <p className="text-sm text-muted-foreground">Sales broken down by shift, from open to close.</p>
                </div>

                {/* Current shift status */}
                <div className="rounded-lg border bg-card p-4">
                    {currentShift ? (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary">Shift #{currentShift.id} — Open</Badge>
                                    <span className="text-sm text-muted-foreground">
                                        since {formatDisplay(currentShift.opened_at)} · {duration(currentShift.opened_at, null)}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Opening cash: {money(currentShift.opening_cash)}
                                    {currentShift.opened_by?.name ? ` · Opened by ${currentShift.opened_by.name}` : ''}
                                </p>
                            </div>
                            {!showCloseForm ? (
                                <Button variant="destructive" size="sm" onClick={() => setShowCloseForm(true)}>
                                    Close Shift
                                </Button>
                            ) : null}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-muted-foreground">No active shift right now.</p>
                            {!showOpenForm ? (
                                <Button size="sm" onClick={() => setShowOpenForm(true)}>
                                    Start Shift
                                </Button>
                            ) : null}
                        </div>
                    )}

                    {showOpenForm && (
                        <div className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4">
                            <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Opening cash</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={openingCash}
                                    onChange={e => setOpeningCash(e.target.value)}
                                    className="w-40 rounded-md border bg-background px-3 py-2 text-sm"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="mb-1 block text-xs text-muted-foreground">Notes (optional)</label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                />
                            </div>
                            <Button size="sm" onClick={openShift} disabled={submitting}>
                                {submitting ? 'Starting…' : 'Confirm Start'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setShowOpenForm(false)}>
                                Cancel
                            </Button>
                        </div>
                    )}

                    {showCloseForm && (
                        <div className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4">
                            <div>
                                <label className="mb-1 block text-xs text-muted-foreground">Closing cash count</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={closingCash}
                                    onChange={e => setClosingCash(e.target.value)}
                                    className="w-40 rounded-md border bg-background px-3 py-2 text-sm"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="mb-1 block text-xs text-muted-foreground">Notes (optional)</label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                />
                            </div>
                            <Button size="sm" variant="destructive" onClick={closeShift} disabled={submitting}>
                                {submitting ? 'Closing…' : 'Confirm Close'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setShowCloseForm(false)}>
                                Cancel
                            </Button>
                        </div>
                    )}
                </div>

                {/* Shift picker + print */}
                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Viewing shift</label>
                        <select
                            value={selectedShiftId}
                            onChange={e => setSelectedShiftId(Number(e.target.value))}
                            className="rounded-md border bg-background px-3 py-2 text-sm"
                        >
                            {shifts.map(s => (
                                <option key={s.id} value={s.id}>
                                    #{s.id} — {formatDisplay(s.opened_at)} → {s.closed_at ? formatDisplay(s.closed_at) : 'now'}
                                    {s.status === 'open' ? ' (open)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedShift && (
                        <p className="text-sm text-muted-foreground pb-2">
                            Duration: {duration(selectedShift.opened_at, selectedShift.closed_at)}
                        </p>
                    )}

                    {activeType && (
                        <Button variant="outline" size="sm" className="ml-auto" onClick={printReport}>
                            Print Report
                        </Button>
                    )}
                </div>

                {/* Report type buttons */}
                <div className="flex flex-wrap gap-2">
                    {REPORT_TYPES.map(rt => (
                        <Button
                            key={rt.key}
                            variant={activeType === rt.key ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => fetchReport(rt.key)}
                            disabled={!selectedShiftId}
                        >
                            {rt.label}
                        </Button>
                    ))}
                </div>

                {/* Report content */}
                {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
                {error && <p className="text-sm text-destructive">{error}</p>}

                {!loading && !error && data && activeType === 'total' && <TotalSalesView data={data as TotalSalesData} />}
                {!loading && !error && data && activeType === 'category' && <CategoryView rows={data as CategoryRow[]} />}
                {!loading && !error && data && activeType === 'discount' && <DiscountView data={data as DiscountData} />}
                {!loading && !error && data && activeType === 'table' && <TableView rows={data as TableRow[]} />}
                {!loading && !error && data && activeType === 'item' && <ItemView rows={data as ItemRow[]} />}
                {!loading && !error && data && activeType === 'order' && <OrderView rows={data as OrderRow[]} />}
                {!loading && !error && data && activeType === 'hourly' && <HourlyView rows={data as HourlyRow[]} />}
            </div>
        </AppLayout>
    );
}

// ---------- Report views ----------

function TotalSalesView({ data }: { data: TotalSalesData }) {
    const cards = [
        { label: 'Total Orders', value: data.total_orders.toString() },
        { label: 'Gross Sales', value: money(data.gross_sales) },
        { label: 'Discounts', value: money(data.total_discount) },
        { label: 'Net Sales', value: money(data.net_sales) },
        { label: 'Cash', value: money(data.cash) },
        { label: 'Card', value: money(data.card) },
        { label: 'Other', value: money(data.other) },
        { label: 'Avg Order Value', value: money(data.average_order_value) },
    ];
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(c => (
                <div key={c.label} className="rounded-lg border bg-card p-4">
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className="text-2xl font-semibold">{c.value}</p>
                </div>
            ))}
        </div>
    );
}

function CategoryView({ rows }: { rows: CategoryRow[] }) {
    const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);
    return (
        <div className="overflow-x-auto rounded-lg border bg-card">
            <div className="border-b px-4 py-3">
                <h2 className="font-medium">Category Wise Sales</h2>
            </div>
            <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                    <tr>
                        <th className="px-4 py-3 font-medium">Category</th>
                        <th className="px-4 py-3 font-medium">Qty Sold</th>
                        <th className="px-4 py-3 font-medium">Revenue</th>
                        <th className="px-4 py-3 font-medium">Share</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <EmptyRow colSpan={4} />
                    ) : (
                        rows.map(r => (
                            <tr key={r.category} className="border-t">
                                <td className="px-4 py-3">{r.category}</td>
                                <td className="px-4 py-3">{r.qty_sold}</td>
                                <td className="px-4 py-3">{money(r.revenue)}</td>
                                <td className="px-4 py-3 text-muted-foreground">
                                    {totalRevenue ? `${((r.revenue / totalRevenue) * 100).toFixed(1)}%` : '—'}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

function DiscountView({ data }: { data: DiscountData }) {
    return (
        <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Total Discount Given</p>
                    <p className="text-2xl font-semibold">{money(data.total_discount_given)}</p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                    <p className="text-xs text-muted-foreground">Discounted Orders</p>
                    <p className="text-2xl font-semibold">{data.discounted_orders_count}</p>
                </div>
            </div>
            <div className="overflow-x-auto rounded-lg border bg-card">
                <div className="border-b px-4 py-3">
                    <h2 className="font-medium">Discounted Orders</h2>
                </div>
                <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-left">
                        <tr>
                            <th className="px-4 py-3 font-medium">Order #</th>
                            <th className="px-4 py-3 font-medium">Table</th>
                            <th className="px-4 py-3 font-medium">Subtotal</th>
                            <th className="px-4 py-3 font-medium">Discount</th>
                            <th className="px-4 py-3 font-medium">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.orders.length === 0 ? (
                            <EmptyRow colSpan={5} />
                        ) : (
                            data.orders.map(o => (
                                <tr key={o.order_number} className="border-t">
                                    <td className="px-4 py-3 font-mono text-xs">{o.order_number}</td>
                                    <td className="px-4 py-3">{o.table ?? '—'}</td>
                                    <td className="px-4 py-3">{money(o.subtotal)}</td>
                                    <td className="px-4 py-3 text-destructive">-{money(o.discount)}</td>
                                    <td className="px-4 py-3">{money(o.total)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function TableView({ rows }: { rows: TableRow[] }) {
    return (
        <div className="overflow-x-auto rounded-lg border bg-card">
            <div className="border-b px-4 py-3">
                <h2 className="font-medium">Table Wise Sales</h2>
            </div>
            <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                    <tr>
                        <th className="px-4 py-3 font-medium">Table</th>
                        <th className="px-4 py-3 font-medium">Orders</th>
                        <th className="px-4 py-3 font-medium">Total Sales</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <EmptyRow colSpan={3} />
                    ) : (
                        rows.map(r => (
                            <tr key={r.table} className="border-t">
                                <td className="px-4 py-3">{r.table}</td>
                                <td className="px-4 py-3">{r.orders}</td>
                                <td className="px-4 py-3">{money(r.total_sales)}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

function ItemView({ rows }: { rows: ItemRow[] }) {
    return (
        <div className="overflow-x-auto rounded-lg border bg-card">
            <div className="border-b px-4 py-3">
                <h2 className="font-medium">Item Wise Sales</h2>
            </div>
            <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                    <tr>
                        <th className="px-4 py-3 font-medium">Item</th>
                        <th className="px-4 py-3 font-medium">Qty Sold</th>
                        <th className="px-4 py-3 font-medium">Revenue</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <EmptyRow colSpan={3} />
                    ) : (
                        rows.map(r => (
                            <tr key={r.item_name} className="border-t">
                                <td className="px-4 py-3">{r.item_name}</td>
                                <td className="px-4 py-3">{r.qty_sold}</td>
                                <td className="px-4 py-3">{money(r.revenue)}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

function OrderView({ rows }: { rows: OrderRow[] }) {
    return (
        <div className="overflow-x-auto rounded-lg border bg-card">
            <div className="border-b px-4 py-3">
                <h2 className="font-medium">Order Wise Breakdown ({rows.length})</h2>
            </div>
            <table className="w-full min-w-[800px] text-sm">
                <thead className="bg-muted/40 text-left">
                    <tr>
                        <th className="px-4 py-3 font-medium">Order #</th>
                        <th className="px-4 py-3 font-medium">Time</th>
                        <th className="px-4 py-3 font-medium">Type</th>
                        <th className="px-4 py-3 font-medium">Table</th>
                        <th className="px-4 py-3 font-medium">Items</th>
                        <th className="px-4 py-3 font-medium">Discount</th>
                        <th className="px-4 py-3 font-medium">Total</th>
                        <th className="px-4 py-3 font-medium">Payment</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <EmptyRow colSpan={8} />
                    ) : (
                        rows.map(o => (
                            <tr key={o.order_number} className="border-t">
                                <td className="px-4 py-3 font-mono text-xs">{o.order_number}</td>
                                <td className="px-4 py-3 text-muted-foreground">{o.time}</td>
                                <td className="px-4 py-3 capitalize">{o.order_type}</td>
                                <td className="px-4 py-3">{o.table ?? '—'}</td>
                                <td className="px-4 py-3">{o.items_count}</td>
                                <td className="px-4 py-3">{o.discount ? `-${money(o.discount)}` : '—'}</td>
                                <td className="px-4 py-3">{money(o.total)}</td>
                                <td className="px-4 py-3">
                                    <Badge variant={paymentVariant(o.payment_method)} className="capitalize">
                                        {o.payment_method ?? 'unpaid'}
                                    </Badge>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

function HourlyView({ rows }: { rows: HourlyRow[] }) {
    const max = Math.max(...rows.map(r => r.total_sales), 1);
    return (
        <div className="rounded-lg border bg-card">
            <div className="border-b px-4 py-3">
                <h2 className="font-medium">Hourly Sales</h2>
            </div>
            <div className="divide-y">
                {rows.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">No sales in this period.</p>
                ) : (
                    rows.map(r => (
                        <div key={r.hour} className="flex items-center gap-4 px-4 py-3">
                            <span className="w-14 shrink-0 text-sm text-muted-foreground">{r.hour}</span>
                            <div className="flex-1">
                                <div className="h-2 rounded-full bg-muted">
                                    <div
                                        className="h-2 rounded-full bg-primary"
                                        style={{ width: `${(r.total_sales / max) * 100}%` }}
                                    />
                                </div>
                            </div>
                            <span className="w-16 shrink-0 text-right text-sm text-muted-foreground">{r.orders} ord</span>
                            <span className="w-28 shrink-0 text-right text-sm font-medium">{money(r.total_sales)}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
    return (
        <tr>
            <td colSpan={colSpan} className="px-4 py-8 text-center text-muted-foreground">
                No data for this shift.
            </td>
        </tr>
    );
}
