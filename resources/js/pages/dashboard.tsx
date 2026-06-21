import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { useEchoPublic } from '@laravel/echo-react';
import { ShoppingBag, ShoppingCart, TrendingUp, Clock } from 'lucide-react';

interface Stats {
    total_orders_today: number;
    revenue_today: number;
    active_carts: number;
    pending_orders: number;
    total_orders: number;
    completed_orders_today: number;
    total_revenue: number;
}

interface OrderItem {
    id: number;
    item: { name: string } | null;
    quantity: number;
    price: number;
    orderItem_status: string;
}

interface Order {
    id: number;
    order_number: string;
    order_type: string;
    order_status: string;
    payment_status: string;
    total_price: number;
    created_at: string;
    user: { name: string } | null;
    table: { name: string } | null;
    items: OrderItem[];
}

interface Props {
    stats: Stats;
    currentOrders: Order[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
];

const orderStatusVariant = (status: string): 'outline' | 'default' | 'secondary' | 'destructive' => {
    if (status === 'completed') return 'secondary';
    if (status === 'cancelled') return 'destructive';
    if (status === 'processing') return 'default';
    return 'outline';
};

const itemStatusVariant = (status: string): 'outline' | 'default' | 'secondary' | 'destructive' => {
    if (status === 'served') return 'secondary';
    if (status === 'cancelled') return 'destructive';
    if (status === 'ready' || status === 'preparing') return 'default';
    return 'outline';
};

function StatCard({
    label,
    value,
    sub,
    icon: Icon,
    accent,
}: {
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ElementType;
    accent?: string;
}) {
    return (
        <div className="rounded-xl border bg-card p-5 shadow-xs">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className={`mt-1 text-2xl font-bold ${accent ?? ''}`}>{value}</p>
                    {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
                </div>
                <div className="rounded-lg bg-muted p-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
            </div>
        </div>
    );
}

export default function Dashboard({ stats, currentOrders }: Props) {
    useEchoPublic('orders', ['.order.placed', '.order.status.updated'], () => {
        router.reload({ only: ['stats', 'currentOrders'] });
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="space-y-6 p-4">
                <h1 className="text-2xl font-semibold">Dashboard</h1>

                {/* Stats */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Orders Today"
                        value={stats.total_orders_today}
                        sub={`${stats.completed_orders_today} completed`}
                        icon={ShoppingBag}
                    />
                    <StatCard
                        label="Revenue Today"
                        value={`Rs. ${stats.revenue_today.toFixed(2)}`}
                        sub={`Rs. ${stats.total_revenue.toFixed(2)} all time`}
                        icon={TrendingUp}
                        accent="text-green-600"
                    />
                    <StatCard
                        label="Pending Orders"
                        value={stats.pending_orders}
                        sub={`${stats.total_orders} total orders`}
                        icon={Clock}
                        accent={stats.pending_orders > 0 ? 'text-orange-500' : undefined}
                    />
                    <StatCard
                        label="Active Carts"
                        value={stats.active_carts}
                        sub="Carts with items"
                        icon={ShoppingCart}
                    />
                </div>

                {/* Current Orders */}
                <div className="rounded-xl border bg-card shadow-xs">
                    <div className="flex items-center justify-between border-b px-4 py-3">
                        <h2 className="font-semibold">Current Orders</h2>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('orders.index')}>View All</Link>
                        </Button>
                    </div>

                    {currentOrders.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No active orders right now.
                        </div>
                    ) : (
                        <div className="divide-y">
                            {currentOrders.map((order) => (
                                <div key={order.id} className="px-4 py-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-mono text-sm font-medium">{order.order_number}</span>
                                                <Badge variant={orderStatusVariant(order.order_status)} className="capitalize text-xs">
                                                    {order.order_status}
                                                </Badge>
                                                <Badge variant="outline" className="capitalize text-xs">
                                                    {order.order_type}
                                                </Badge>
                                                {order.table && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {order.table.name}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                {order.user?.name ?? 'Unknown'} · {new Date(order.created_at).toLocaleTimeString()}
                                            </p>

                                            {/* Items breakdown */}
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {order.items.map((oi) => (
                                                    <div key={oi.id} className="flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-xs">
                                                        <span>{oi.item?.name ?? '—'} ×{oi.quantity}</span>
                                                        <Badge variant={itemStatusVariant(oi.orderItem_status)} className="text-[10px] px-1 py-0 h-4 capitalize">
                                                            {oi.orderItem_status}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex shrink-0 flex-col items-end gap-2">
                                            <span className="font-medium text-sm">Rs. {Number(order.total_price).toFixed(2)}</span>
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={route('orders.show', order.id)}>Manage</Link>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
