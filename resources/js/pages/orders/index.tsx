import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEchoPublic } from '@laravel/echo-react';
import { useEffect, useState } from 'react';
import PaymentModal from './payment-modal';

interface OrderItem {
    id: number;
    item: { name: string };
    quantity: number;
    price: number;
    orderItem_status: string;
}

interface PaymentSplit {
    id: number;
    payment_method: string;
    amount: string; // Changed to string based on backend dump ("150.00")
    amount_tendered: string | null;
    balance_returned: string | null;
}

interface Order {
    id: number;
    order_number: string;
    order_type: string;
    order_status: string;
    payment_status: string;
    payment_method?: string;
    total_price: number;
    subtotal: number;
    discount: number;
    created_at: string;
    user: { id: number; name: string } | null;
    table: { id: number; name: string } | null;
    items: OrderItem[];

    // Accept either case depending on Laravel's JSON serialization settings
    payment_splits?: PaymentSplit[];
    paymentSplits?: PaymentSplit[];
}

interface Props {
    orders: Order[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Orders', href: '/orders' },
];

const orderStatusVariant = (status: string): 'secondary' | 'destructive' | 'outline' | 'default' => {
    if (status === 'completed') return 'secondary';
    if (status === 'cancelled') return 'destructive';
    if (status === 'processing') return 'default';
    return 'outline';
};

const paymentStatusVariant = (status: string): 'secondary' | 'destructive' | 'outline' => {
    if (status === 'paid') return 'secondary';
    if (status === 'failed') return 'destructive';
    return 'outline';
};

export default function OrdersIndex({ orders }: Props) {
    const { auth } = usePage<SharedData>().props;
    const isAdmin = auth.user.type === 'admin';
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [printingId, setPrintingId] = useState<number | null>(null);
    const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);

    // Maintain a local state of orders so we can patch them instantly via broadcasts
    const [localOrders, setLocalOrders] = useState<Order[]>(orders);

    // Sync local state if the main prop updates (e.g., via pagination or Inertia reload)
    useEffect(() => {
        setLocalOrders(orders);
    }, [orders]);

    // 1. New Order: We reload to grab full relationships (user, dates, payment splits)
    useEchoPublic('orders', '.order.placed', () => {
        router.reload({ only: ['orders'], preserveScroll: true, preserveState: true });
    });

    // 2. Order Status: Instantly update the order_status and payment_status locally
    useEchoPublic('orders', '.order.status.updated', (e: any) => {
        setLocalOrders((prev) =>
            prev.map((o) =>
                o.id === e.order_id
                    ? { ...o, order_status: e.order_status, payment_status: e.payment_status }
                    : o
            )
        );
    });

    // 3. Order Items Bulk Update: Map the broadcast payload format to our local interface
    useEchoPublic('orders', '.order.items.updated', (e: any) => {
        setLocalOrders((prev) =>
            prev.map((o) => {
                if (o.id === e.order_id) {
                    return {
                        ...o,
                        total_price: e.total_price,
                        items: e.items.map((i: any) => ({
                            id: i.id,
                            item: { name: i.name },
                            quantity: i.quantity,
                            price: i.price,
                            orderItem_status: i.status,
                        })),
                    };
                }
                return o;
            })
        );
    });

    // 4. Individual Order Item Status Update: Find the item and patch its status
    useEchoPublic('orders', '.order.item.status.updated', (e: any) => {
        setLocalOrders((prev) =>
            prev.map((o) => {
                if (o.id === e.order_id) {
                    return {
                        ...o,
                        items: o.items.map((item) =>
                            item.id === e.order_item_id
                                ? { ...item, orderItem_status: e.status }
                                : item
                        ),
                    };
                }
                return o;
            })
        );
    });

    const markCompleted = (order: Order) => {
        setProcessingId(order.id);
        router.patch(
            route('orders.update-status', order.id),
            { order_status: 'completed' },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setProcessingId(null),
            }
        );
    };

    const cancelOrder = (order: Order) => {
        if (!confirm('Are you sure you want to cancel this order?')) return;

        setProcessingId(order.id);
        router.patch(
            route('orders.cancel', order.id),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setProcessingId(null),
            }
        );
    };

    const silentPrint = (order: Order) => {
        setPrintingId(order.id);

        router.post(
            route('orders.silent-print', order.id),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setPrintingId(null),
            }
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Orders" />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Orders</h1>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">{localOrders.length} total</span>
                        <Button asChild>
                            <Link href={route('orders.create')}>Create Order</Link>
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-lg border bg-card shadow-xs">
                    <table className="w-full min-w-[900px] text-sm">
                        <thead className="bg-muted/40 text-left">
                            <tr>
                                <th className="px-4 py-3 font-medium">Order #</th>
                                <th className="px-4 py-3 font-medium">Type</th>
                                <th className="px-4 py-3 font-medium">Customer</th>
                                <th className="px-4 py-3 font-medium">Table</th>
                                <th className="px-4 py-3 font-medium">Items</th>
                                <th className="px-4 py-3 font-medium">Total</th>
                                <th className="px-4 py-3 font-medium">Order Status</th>
                                <th className="px-4 py-3 font-medium">Payment</th>
                                <th className="px-4 py-3 font-medium">Date</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {localOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                                        No orders found.
                                    </td>
                                </tr>
                            ) : (
                                localOrders.map((order) => {
                                    const isPaid = order.payment_status === 'paid';
                                    const isCompleted = order.order_status === 'completed';
                                    const isCancelled = order.order_status === 'cancelled';
                                    const isBusy = processingId === order.id;

                                    const splits = order.payment_splits || order.paymentSplits || [];
                                    const hasSplits = splits.length > 0;

                                    return (
                                        <tr key={order.id} className="border-t">
                                            <td className="px-4 py-3 font-mono text-xs">{order.order_number}</td>
                                            <td className="px-4 py-3 capitalize">{order.order_type}</td>
                                            <td className="px-4 py-3">{order.user?.name ?? '—'}</td>
                                            <td className="px-4 py-3">{order.table?.name ?? '—'}</td>
                                            <td className="px-4 py-3">{order.items.length}</td>
                                            <td className="px-4 py-3">Rs. {Number(order.total_price).toFixed(2)}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant={orderStatusVariant(order.order_status)} className="capitalize">
                                                    {order.order_status}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={paymentStatusVariant(order.payment_status)} className="capitalize">
                                                    {order.payment_status}
                                                </Badge>
                                                {isPaid && order.payment_method && !hasSplits && (
                                                    <span className="block text-xs text-muted-foreground mt-1">
                                                        ({order.payment_method})
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {new Date(order.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex flex-wrap justify-end gap-2">

                                                    {isPaid && hasSplits && (
                                                        <span className="block text-xs text-muted-foreground mt-1 w-full text-right mb-1">
                                                            {splits
                                                                .map((s) => `${s.payment_method.replace('_', ' ')} Rs.${Number(s.amount).toFixed(2)}`)
                                                                .join(' + ')}
                                                        </span>
                                                    )}

                                                    {!isPaid && !isCancelled && (
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            disabled={isBusy}
                                                            onClick={() => setPaymentOrder(order)}
                                                        >
                                                            Pay
                                                        </Button>
                                                    )}

                                                    {!isCompleted && !isCancelled && (
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            disabled={isBusy}
                                                            onClick={() => markCompleted(order)}
                                                        >
                                                            Complete
                                                        </Button>
                                                    )}

                                                    {isAdmin && !isCompleted && !isCancelled && (
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            disabled={isBusy}
                                                            onClick={() => cancelOrder(order)}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    )}

                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={route('orders.show', order.id)}>View</Link>
                                                    </Button>

                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => silentPrint(order)}
                                                        disabled={isBusy || printingId === order.id}
                                                    >
                                                        {printingId === order.id ? 'Printing…' : 'Print'}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {paymentOrder && (
                <PaymentModal
                    order={paymentOrder}
                    open={!!paymentOrder}
                    onOpenChange={(open) => !open && setPaymentOrder(null)}
                />
            )}
        </AppLayout>
    );
}
