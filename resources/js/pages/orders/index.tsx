import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEchoPublic } from '@laravel/echo-react';
import { useState } from 'react';

interface OrderItem {
    id: number;
    item: { name: string };
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
    payment_method: string | null;
    total_price: number;
    created_at: string;
    user: { id: number; name: string } | null;
    table: { id: number; name: string } | null;
    items: OrderItem[];
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

    useEchoPublic('orders', ['.order.placed', '.order.status.updated'], () => {
        router.reload({ only: ['orders'] });
    });

    const markPaid = (order: Order, method: string) => {
        setProcessingId(order.id);
        router.patch(
            route('orders.update-payment-status', order.id),
            {
                payment_status: 'paid',
                payment_method: method
            },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setProcessingId(null),
            }
        );
    };

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

    const paymentMethods = ['Cash', 'Visa', 'Master', 'Uber', 'Pickme', 'Bank_Transfer']; // Added Bank_Transfer to the list of payment methods

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Orders" />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Orders</h1>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">{orders.length} total</span>
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
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                                        No orders found.
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => {
                                    const isPaid = order.payment_status === 'paid';
                                    const isCompleted = order.order_status === 'completed';
                                    const isCancelled = order.order_status === 'cancelled';
                                    const isBusy = processingId === order.id;

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
                                                {isPaid && order.payment_method && (
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

                                                    {!isPaid && !isCancelled && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    disabled={isBusy}
                                                                >
                                                                    Mark Paid
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                {paymentMethods.map((method) => (
                                                                    <DropdownMenuItem
                                                                        key={method}
                                                                        onClick={() => markPaid(order, method)}
                                                                        className="cursor-pointer"
                                                                    >
                                                                        {method}
                                                                    </DropdownMenuItem>
                                                                ))}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
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
        </AppLayout>
    );
}
