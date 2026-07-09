import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { useEchoPublic } from '@laravel/echo-react';

interface JuiceBarPlacedOrderPayload {
    order_id: number;
    order_number: string;
    order_status: string;
    order_type: string;
    table_name: string;
    table_id: number | null;
    total_price: number;
    has_juice_bar_items?: boolean;
}

interface JuiceBarOrderItem {
    id: number;
    quantity: number;
    price: number;
    orderItem_status: string;
    item: {
        id: number;
        name: string;
    } | null;
}

interface JuiceBarOrder {
    id: number;
    order_number: string;
    order_type: string;
    order_status: string;
    created_at: string;
    user: { id: number; name: string } | null;
    table: { id: number; name: string } | null;
    items: JuiceBarOrderItem[];
}

interface Props {
    orders: JuiceBarOrder[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Juice Bar', href: '/juice-bar' },
];

const statusVariant = (status: string): 'secondary' | 'destructive' | 'outline' | 'default' => {
    if (status === 'completed') return 'secondary';
    if (status === 'cancelled') return 'destructive';
    if (status === 'processing' || status === 'pending') return 'default';
    return 'outline';
};

export default function JuiceBarIndex({ orders }: Props) {
    useEchoPublic<JuiceBarPlacedOrderPayload>('orders', ['.order.placed', '.order.status.updated', '.order.item.status.updated'], (payload) => {
        if (payload.has_juice_bar_items === false) {
            return;
        }

        router.reload({ only: ['orders'] });
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Juice Bar" />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Juice Bar</h1>
                        <p className="text-sm text-muted-foreground">Orders with items assigned to the Juice Bar counter.</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{orders.length} active orders</span>
                </div>

                <div className="space-y-4">
                    {orders.length === 0 ? (
                        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
                            No Juice Bar orders yet.
                        </div>
                    ) : (
                        orders.map((order) => (
                            <div key={order.id} className="rounded-lg border bg-card shadow-xs">
                                <div className="flex flex-col gap-3 border-b px-4 py-4 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="font-mono text-lg font-semibold">{order.order_number}</h2>
                                            <Badge variant={statusVariant(order.order_status)} className="capitalize">
                                                {order.order_status}
                                            </Badge>
                                            <Badge variant="outline" className="capitalize">
                                                {order.order_type}
                                            </Badge>
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {order.user?.name ?? 'Walk-in'} {order.table ? `• ${order.table.name}` : ''} • {new Date(order.created_at).toLocaleString()}
                                        </p>
                                    </div>

                                    <Button variant="outline" asChild>
                                        <Link href={route('orders.show', order.id)}>Open Order</Link>
                                    </Button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/40 text-left">
                                            <tr>
                                                <th className="px-4 py-3 font-medium">Item</th>
                                                <th className="px-4 py-3 font-medium">Qty</th>
                                                <th className="px-4 py-3 font-medium">Status</th>
                                                <th className="px-4 py-3 font-medium">Price</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {order.items.map((orderItem) => (
                                                <tr key={orderItem.id} className="border-t">
                                                    <td className="px-4 py-3 font-medium">{orderItem.item?.name ?? '—'}</td>
                                                    <td className="px-4 py-3">{orderItem.quantity}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant={statusVariant(orderItem.orderItem_status)} className="capitalize">
                                                            {orderItem.orderItem_status}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3">Rs. {Number(orderItem.price).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
