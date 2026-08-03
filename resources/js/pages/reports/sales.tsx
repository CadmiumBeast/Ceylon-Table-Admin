import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';

interface DayEndData {
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
interface ItemRow { item_name: string; qty_sold: number; revenue: number; }
interface HourlyRow { hour: string; orders: number; total_sales: number; }

type ReportType = 'day_end' | 'category' | 'hourly' | 'item';

const REPORT_TYPES: { key: ReportType; label: string }[] = [
    { key: 'day_end', label: 'Day End Sales' },
    { key: 'category', label: 'Category Wise' },
    { key: 'hourly', label: 'Hourly Sales' },
    { key: 'item', label: 'Sales by Item' },
];

interface Props {
    date: string; // YYYY-MM-DD
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Reports', href: '/reports/sales' }];

const money = (n: number) =>
    `Rs. ${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SalesReport({ date: initialDate }: Props) {
    const [date, setDate] = useState(initialDate);
    const [activeType, setActiveType] = useState<ReportType>('day_end');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchReport(activeType);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date]);

    const fetchReport = async (type: ReportType) => {
        setLoading(true);
        setError(null);
        setActiveType(type);
        try {
            const res = await axios.get('/reports/sales/data', { params: { date, type } });
            setData(res.data.data);
        } catch {
            setError('Could not load this report. Try again.');
        } finally {
            setLoading(false);
        }
    };

    const setToday = () => setDate(new Date().toISOString().slice(0, 10));
    const setYesterday = () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        setDate(d.toISOString().slice(0, 10));
    };

    const printReport = () => {
        setPrinting(true);
        router.post(
            '/reports/sales/print',
            { date, type: activeType },
            { preserveScroll: true, onFinish: () => setPrinting(false) }
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sales Reports" />

            <div className="space-y-6 p-4">
                <div>
                    <h1 className="text-2xl font-semibold">Sales Reports</h1>
                    <p className="text-sm text-muted-foreground">Pick a day, then print straight to the terminal printer.</p>
                </div>

                <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
                    <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="rounded-md border bg-background px-3 py-2 text-sm"
                        />
                    </div>
                    <Button variant="outline" size="sm" onClick={setToday}>Today</Button>
                    <Button variant="outline" size="sm" onClick={setYesterday}>Yesterday</Button>

                    <Button size="sm" className="ml-auto" onClick={printReport} disabled={printing || loading}>
                        {printing ? 'Printing…' : 'Print Report'}
                    </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                    {REPORT_TYPES.map((rt) => (
                        <Button
                            key={rt.key}
                            variant={activeType === rt.key ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => fetchReport(rt.key)}
                        >
                            {rt.label}
                        </Button>
                    ))}
                </div>

                {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
                {error && <p className="text-sm text-destructive">{error}</p>}

                {!loading && !error && data && activeType === 'day_end' && <DayEndView data={data as DayEndData} />}
                {!loading && !error && data && activeType === 'category' && <RowsView rows={data as CategoryRow[]} labelKey="category" title="Category Wise Sales" />}
                {!loading && !error && data && activeType === 'item' && <RowsView rows={data as ItemRow[]} labelKey="item_name" title="Sales by Item" />}
                {!loading && !error && data && activeType === 'hourly' && <HourlyView rows={data as HourlyRow[]} />}
            </div>
        </AppLayout>
    );
}

function DayEndView({ data }: { data: DayEndData }) {
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
            {cards.map((c) => (
                <div key={c.label} className="rounded-lg border bg-card p-4">
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className="text-2xl font-semibold">{c.value}</p>
                </div>
            ))}
        </div>
    );
}

function RowsView({ rows, labelKey, title }: { rows: any[]; labelKey: string; title: string }) {
    return (
        <div className="overflow-x-auto rounded-lg border bg-card">
            <div className="border-b px-4 py-3"><h2 className="font-medium">{title}</h2></div>
            <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                    <tr>
                        <th className="px-4 py-3 font-medium">{labelKey === 'category' ? 'Category' : 'Item'}</th>
                        <th className="px-4 py-3 font-medium">Qty Sold</th>
                        <th className="px-4 py-3 font-medium">Revenue</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No data for this day.</td></tr>
                    ) : (
                        rows.map((r) => (
                            <tr key={r[labelKey]} className="border-t">
                                <td className="px-4 py-3">{r[labelKey]}</td>
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

function HourlyView({ rows }: { rows: HourlyRow[] }) {
    const max = Math.max(...rows.map((r) => r.total_sales), 1);
    return (
        <div className="rounded-lg border bg-card">
            <div className="border-b px-4 py-3"><h2 className="font-medium">Hourly Sales</h2></div>
            <div className="divide-y">
                {rows.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">No sales this day.</p>
                ) : (
                    rows.map((r) => (
                        <div key={r.hour} className="flex items-center gap-4 px-4 py-3">
                            <span className="w-14 shrink-0 text-sm text-muted-foreground">{r.hour}</span>
                            <div className="flex-1">
                                <div className="h-2 rounded-full bg-muted">
                                    <div className="h-2 rounded-full bg-primary" style={{ width: `${(r.total_sales / max) * 100}%` }} />
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
