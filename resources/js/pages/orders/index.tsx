import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { useEchoPublic } from '@laravel/echo-react';

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
    useEchoPublic('orders', ['.order.placed', '.order.status.updated'], () => {
        router.reload({ only: ['orders'] });
    });

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
                    <table className="w-full min-w-[800px] text-sm">
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
                                orders.map((order) => (
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
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {new Date(order.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={route('orders.show', order.id)}>View</Link>
                                            </Button>
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
