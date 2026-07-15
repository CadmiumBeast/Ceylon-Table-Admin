import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface ItemBreakdown {
    name: string;
    quantity: number;
    total: number;
}

interface PaymentBreakdown {
    method: string;
    count: number;
    total: number;
}

interface TypeBreakdown {
    type: string;
    count: number;
    total: number;
}

interface StatusBreakdown {
    status: string;
    count: number;
}

interface OrderRow {
    id: number;
    order_number: string;
    order_type: string;
    order_status: string;
    payment_status: string;
    payment_method: string | null;
    table: string | null;
    customer: string | null;
    subtotal: number;
    discount: number;
    total_price: number;
    created_at: string;
}

interface Summary {
    order_count: number;
    completed_count: number;
    cancelled_count: number;
    total_revenue: number;
    total_subtotal: number;
    total_discount: number;
    average_order_value: number;
    item_breakdown: ItemBreakdown[];
    payment_breakdown: PaymentBreakdown[];
    type_breakdown: TypeBreakdown[];
    status_breakdown: StatusBreakdown[];
    orders: OrderRow[];
}

interface Props {
    summary: Summary;
    date_from: string;
    date_to: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reports', href: '/reports/summary' },
];

const statusVariant = (status: string): 'secondary' | 'destructive' | 'outline' | 'default' => {
    if (status === 'completed') return 'secondary';
    if (status === 'cancelled') return 'destructive';
    if (status === 'processing') return 'default';
    return 'outline';
};

// Formats a Date as 'YYYY-MM-DDTHH:mm' for datetime-local inputs / query params
function toLocalInputValue(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDisplay(value: string): string {
    return new Date(value).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
}

export default function ReportsSummary({ summary, date_from, date_to }: Props) {
    const [dateFrom, setDateFrom] = useState(date_from);
    const [dateTo, setDateTo] = useState(date_to);

    const applyRange = (from: string, to: string) => {
        setDateFrom(from);
        setDateTo(to);
        router.get(route('reports.summary'), { date_from: from, date_to: to }, { preserveState: true });
    };

    const quickHours = (hours: number) => {
        const to = new Date();
        const from = new Date(to.getTime() - hours * 60 * 60 * 1000);
        applyRange(toLocalInputValue(from), toLocalInputValue(to));
    };

    const quickDays = (days: number) => {
        const to = new Date();
        const from = new Date(to);
        from.setDate(from.getDate() - days);
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        applyRange(toLocalInputValue(from), toLocalInputValue(to));
    };

    const today = () => {
        const from = new Date();
        from.setHours(0, 0, 0, 0);
        const to = new Date();
        to.setHours(23, 59, 59, 999);
        applyRange(toLocalInputValue(from), toLocalInputValue(to));
    };

    const openPrint = () => {
        window.open(
            route('reports.summary.print', { date_from: dateFrom, date_to: dateTo }),
            '_blank'
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sales Summary" />

            <div className="space-y-6 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Sales Summary</h1>
                        <p className="text-sm text-muted-foreground">
                            {formatDisplay(dateFrom)} — {formatDisplay(dateTo)}
                        </p>
                    </div>
                    <Button onClick={openPrint}>Print Report</Button>
                </div>

                {/* Filters */}
                <div className="space-y-3 rounded-lg border bg-card p-4">
                    <div className="flex flex-wrap items-end gap-3">
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">From</label>
                            <input
                                type="datetime-local"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="rounded-md border bg-background px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">To</label>
                            <input
                                type="datetime-local"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="rounded-md border bg-background px-3 py-2 text-sm"
                            />
                        </div>
                        <Button variant="outline" size="sm" onClick={() => applyRange(dateFrom, dateTo)}>
                            Apply
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                        <span className="text-xs text-muted-foreground mr-1">Last few hours:</span>
                        <Button variant="outline" size="sm" onClick={() => quickHours(1)}>1h</Button>
                        <Button variant="outline" size="sm" onClick={() => quickHours(3)}>3h</Button>
                        <Button variant="outline" size="sm" onClick={() => quickHours(6)}>6h</Button>
                        <Button variant="outline" size="sm" onClick={() => quickHours(12)}>12h</Button>
                        <Button variant="outline" size="sm" onClick={() => quickHours(24)}>24h</Button>

                        <span className="mx-2 h-4 w-px bg-border" />

                        <Button variant="outline" size="sm" onClick={today}>Today</Button>
                        <Button variant="outline" size="sm" onClick={() => quickDays(7)}>Last 7 Days</Button>
                        <Button variant="outline" size="sm" onClick={() => quickDays(30)}>Last 30 Days</Button>
                    </div>
                </div>

                {/* KPI cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border bg-card p-4">
                        <p className="text-xs text-muted-foreground">Total Orders</p>
                        <p className="text-2xl font-semibold">{summary.order_count}</p>
                    </div>
                    <div className="rounded-lg border bg-card p-4">
                        <p className="text-xs text-muted-foreground">Revenue (Paid)</p>
                        <p className="text-2xl font-semibold">Rs. {summary.total_revenue.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg border bg-card p-4">
                        <p className="text-xs text-muted-foreground">Discounts Given</p>
                        <p className="text-2xl font-semibold">Rs. {summary.total_discount.toFixed(2)}</p>
                    </div>
                    <div className="rounded-lg border bg-card p-4">
                        <p className="text-xs text-muted-foreground">Avg Order Value</p>
                        <p className="text-2xl font-semibold">Rs. {summary.average_order_value.toFixed(2)}</p>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    {/* Status breakdown */}
                    <div className="rounded-lg border bg-card p-4">
                        <h2 className="mb-3 font-medium">By Status</h2>
                        <div className="space-y-2 text-sm">
                            {summary.status_breakdown.map((s) => (
                                <div key={s.status} className="flex items-center justify-between">
                                    <Badge variant={statusVariant(s.status)} className="capitalize">{s.status}</Badge>
                                    <span>{s.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Order type breakdown */}
                    <div className="rounded-lg border bg-card p-4">
                        <h2 className="mb-3 font-medium">By Order Type</h2>
                        <div className="space-y-2 text-sm">
                            {summary.type_breakdown.map((t) => (
                                <div key={t.type} className="flex items-center justify-between">
                                    <span className="capitalize">{t.type}</span>
                                    <span>{t.count} — Rs. {t.total.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Payment breakdown */}
                    <div className="rounded-lg border bg-card p-4">
                        <h2 className="mb-3 font-medium">By Payment Method</h2>
                        <div className="space-y-2 text-sm">
                            {summary.payment_breakdown.map((p) => (
                                <div key={p.method} className="flex items-center justify-between">
                                    <span className="capitalize">{p.method}</span>
                                    <span>{p.count} — Rs. {p.total.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Top items */}
                <div className="rounded-lg border bg-card">
                    <div className="border-b px-4 py-3">
                        <h2 className="font-medium">Items Sold</h2>
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-left">
                            <tr>
                                <th className="px-4 py-3 font-medium">Item</th>
                                <th className="px-4 py-3 font-medium">Quantity</th>
                                <th className="px-4 py-3 font-medium">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summary.item_breakdown.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                                        No items sold in this range.
                                    </td>
                                </tr>
                            ) : (
                                summary.item_breakdown.map((item) => (
                                    <tr key={item.name} className="border-t">
                                        <td className="px-4 py-3">{item.name}</td>
                                        <td className="px-4 py-3">{item.quantity}</td>
                                        <td className="px-4 py-3">Rs. {item.total.toFixed(2)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Orders list */}
                <div className="overflow-x-auto rounded-lg border bg-card">
                    <div className="border-b px-4 py-3">
                        <h2 className="font-medium">Orders ({summary.orders.length})</h2>
                    </div>
                    <table className="w-full min-w-[800px] text-sm">
                        <thead className="bg-muted/40 text-left">
                            <tr>
                                <th className="px-4 py-3 font-medium">Order #</th>
                                <th className="px-4 py-3 font-medium">Type</th>
                                <th className="px-4 py-3 font-medium">Table</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">Payment</th>
                                <th className="px-4 py-3 font-medium">Total</th>
                                <th className="px-4 py-3 font-medium">Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summary.orders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                        No orders in this range.
                                    </td>
                                </tr>
                            ) : (
                                summary.orders.map((o) => (
                                    <tr key={o.id} className="border-t">
                                        <td className="px-4 py-3 font-mono text-xs">{o.order_number}</td>
                                        <td className="px-4 py-3 capitalize">{o.order_type}</td>
                                        <td className="px-4 py-3">{o.table ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant={statusVariant(o.order_status)} className="capitalize">
                                                {o.order_status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 capitalize">{o.payment_status}</td>
                                        <td className="px-4 py-3">Rs. {Number(o.total_price).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {new Date(o.created_at).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
