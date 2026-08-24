import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEchoPublic } from '@laravel/echo-react';
import { useState } from 'react';

interface Item {
    id: number;
    name: string;
}

interface OrderItem {
    id: number;
    item: Item | null;
    item_name?: string | null;
    quantity: number;
    price: number;
    orderItem_status: string;
    notes: string | null;
}

interface Order {
    id: number;
    order_number: string;
    order_type: string;
    order_status: string;
    payment_status: string;
    payment_method: string | null;
    total_price: number;
    subtotal: number;
    discount: number;
    created_at: string;
    user: { id: number; name: string; email: string } | null;
    table: { id: number; name: string } | null;
    items: OrderItem[];
}

interface Props {
    order: Order;
}

const ORDER_STATUSES = ['pending', 'processing', 'completed'] as const;
const PAYMENT_STATUSES = ['pending', 'paid', 'failed'] as const;
const ITEM_STATUSES = ['pending', 'preparing', 'ready', 'served', 'cancelled'] as const;

const breadcrumbs = (orderNumber: string): BreadcrumbItem[] => [
    { title: 'Orders', href: '/orders' },
    { title: orderNumber, href: '#' },
];

const itemStatusVariant = (status: string): 'outline' | 'default' | 'secondary' | 'destructive' => {
    if (status === 'served') return 'secondary';
    if (status === 'cancelled') return 'destructive';
    if (status === 'ready') return 'default';
    if (status === 'preparing') return 'default';
    return 'outline';
};

function OrderStatusForm({ orderId, currentStatus }: { orderId: number; currentStatus: string }) {
    const { data, setData, patch, processing } = useForm({ order_status: currentStatus });

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                patch(route('orders.update-status', orderId));
            }}
            className="flex items-center gap-2"
        >
            <select
                value={data.order_status}
                onChange={(e) => setData('order_status', e.target.value)}
                className="rounded-md border bg-background px-3 py-1.5 text-sm capitalize"
            >
                {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s} className="capitalize">{s}</option>
                ))}
            </select>
            <Button type="submit" size="sm" disabled={processing || data.order_status === currentStatus}>
                Update
            </Button>
        </form>
    );
}

function PaymentStatusForm({ orderId, currentStatus }: { orderId: number; currentStatus: string }) {
    const { data, setData, patch, processing } = useForm({ payment_status: currentStatus });

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                patch(route('orders.update-payment-status', orderId));
            }}
            className="flex items-center gap-2"
        >
            <select
                value={data.payment_status}
                onChange={(e) => setData('payment_status', e.target.value)}
                className="rounded-md border bg-background px-3 py-1.5 text-sm capitalize"
            >
                {PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s} className="capitalize">{s}</option>
                ))}
            </select>
            <Button type="submit" size="sm" disabled={processing || data.payment_status === currentStatus}>
                Update
            </Button>
        </form>
    );
}

function ItemStatusForm({ orderId, orderItem }: { orderId: number; orderItem: OrderItem }) {
    const { data, setData, patch, processing } = useForm({ orderItem_status: orderItem.orderItem_status });

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                patch(route('orders.update-item-status', { order: orderId, orderItem: orderItem.id }));
            }}
            className="flex items-center gap-2"
        >
            <select
                value={data.orderItem_status}
                onChange={(e) => setData('orderItem_status', e.target.value)}
                className="rounded-md border bg-background px-2 py-1 text-xs capitalize"
            >
                {ITEM_STATUSES.map((s) => (
                    <option key={s} value={s} className="capitalize">{s}</option>
                ))}
            </select>
            <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={processing || data.orderItem_status === orderItem.orderItem_status}
                className="text-xs"
            >
                Save
            </Button>
        </form>
    );
}

export default function OrderShow({ order }: Props) {
    const { auth } = usePage<SharedData>().props;
    const isAdmin = auth.user.type === 'admin';
    const [printing, setPrinting] = useState(false);
    const [removingId, setRemovingId] = useState<number | null>(null);

    useEchoPublic<{ order_id: number }>('orders', ['.order.status.updated', '.order.item.status.updated'], (data) => {
        if (data.order_id === order.id) {
            router.reload({ only: ['order'] });
        }
    }, [order.id]);

    const handlePrint = () => {
        setPrinting(true);

        router.post(route('orders.silent-print', order.id), {}, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setPrinting(false),
        });
    };

    const handleCancel = () => {
        if (!confirm('Are you sure you want to cancel this order?')) return;

        router.patch(route('orders.cancel', order.id), {}, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const removeItem = (orderItem: OrderItem) => {
        if (!confirm(`Remove ${orderItem.item_name ?? orderItem.item?.name ?? 'this item'}? If it's already prepared, it'll be saved for reuse on another order.`)) return;

        setRemovingId(orderItem.id);
        router.delete(route('orders.remove-item', { order: order.id, orderItem: orderItem.id }), {
            preserveScroll: true,
            onFinish: () => setRemovingId(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs(order.order_number)}>
            <Head title={`Order ${order.order_number}`} />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold font-mono">{order.order_number}</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Placed {new Date(order.created_at).toLocaleString()}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrint}
                            disabled={printing}
                        >
                            {printing ? 'Printing…' : 'Print'}
                        </Button>
                        {isAdmin && !['completed', 'cancelled'].includes(order.order_status) && (
                            <Button variant="destructive" size="sm" onClick={handleCancel}>
                                Cancel
                            </Button>
                        )}
                        {!['completed', 'cancelled'].includes(order.order_status) && (
                            <Button variant="outline" asChild>
                                <Link href={route('orders.edit', order.id)}>Add Items</Link>
                            </Button>
                        )}

                        {isAdmin && (
                            <Button variant="outline" asChild>
                                <Link href={route('orders.adminedit', order.id)}>Edit Order</Link>
                            </Button>
                        )}
                        <Button variant="outline" asChild>
                            <Link href={route('orders.index')}>Back to Orders</Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {/* Order Info */}
                    <div className="rounded-lg border bg-card p-4 space-y-3">
                        <h2 className="font-medium">Order Details</h2>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Type</span>
                                <span className="capitalize">{order.order_type}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Customer</span>
                                <span>{order.user?.name ?? '—'}</span>
                            </div>
                            {order.table && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Table</span>
                                    <span>{order.table.name}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>Rs. {Number(order.subtotal).toFixed(2)}</span>
                            </div>
                            {Number(order.discount) > 0 && (
                                <div className="flex justify-between text-green-600">
                                    <span>Discount</span>
                                    <span>- Rs. {Number(order.discount).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-medium border-t pt-2">
                                <span>Total</span>
                                <span>Rs. {Number(order.total_price).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Status Controls */}
                    <div className="rounded-lg border bg-card p-4 space-y-4">
                        <h2 className="font-medium">Status</h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Order Status</p>
                                {order.order_status === 'cancelled' ? (
                                    <Badge variant="destructive" className="capitalize">
                                        {order.order_status}
                                    </Badge>
                                ) : (
                                    <OrderStatusForm orderId={order.id} currentStatus={order.order_status} />
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Payment Status</p>
                                <PaymentStatusForm orderId={order.id} currentStatus={order.payment_status} />
                            </div>
                            {order.payment_method && (
                                <div className="text-sm">
                                    <span className="text-muted-foreground">Payment Method: </span>
                                    <span className="capitalize">{order.payment_method}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Order Items */}
                <div className="rounded-lg border bg-card">
                    <div className="px-4 py-3 border-b">
                        <h2 className="font-medium">Order Items</h2>
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-left">
                            <tr>
                                <th className="px-4 py-3 font-medium">Item</th>
                                <th className="px-4 py-3 font-medium">Qty</th>
                                <th className="px-4 py-3 font-medium">Unit Price</th>
                                <th className="px-4 py-3 font-medium">Line Total</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">Change Status</th>
                                <th className="px-4 py-3 font-medium">Remove</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.items.map((orderItem) => (
                                <tr key={orderItem.id} className="border-t">
                                    <td className="px-4 py-3">
                                        {orderItem.item_name ?? orderItem.item?.name ?? '—'}
                                        {orderItem.notes && (
                                            <span className="block text-xs text-muted-foreground mt-1">
                                                {orderItem.notes}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">{orderItem.quantity}</td>
                                    <td className="px-4 py-3">Rs. {Number(orderItem.price).toFixed(2)}</td>
                                    <td className="px-4 py-3">Rs. {(Number(orderItem.price) * orderItem.quantity).toFixed(2)}</td>
                                    <td className="px-4 py-3">
                                        <Badge variant={itemStatusVariant(orderItem.orderItem_status)} className="capitalize text-xs">
                                            {orderItem.orderItem_status}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                        <ItemStatusForm orderId={order.id} orderItem={orderItem} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive"
                                            disabled={removingId === orderItem.id || ['served', 'cancelled'].includes(orderItem.orderItem_status)}
                                            onClick={() => removeItem(orderItem)}
                                        >
                                            {removingId === orderItem.id ? 'Removing…' : 'Remove'}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
