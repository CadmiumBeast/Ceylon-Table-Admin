import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Head } from '@inertiajs/react';
import { useEchoPublic } from '@laravel/echo-react';
import { useState } from 'react';

// Define interfaces based on the event broadcast payloads
interface OrderItem {
    id: number;
    item_id: number;
    name: string;
    quantity: number;
    price: number;
    status: string;
}

interface LiveOrder {
    order_id: number;
    order_number: string;
    order_status: string;
    order_type?: string;
    payment_status?: string;
    table_name?: string;
    table_id?: number | null;
    total_price?: number;
    has_juice_bar_items?: boolean;
    items: OrderItem[];
}

interface Props {
    initialOrders: LiveOrder[]; // Passed from the controller on initial load
}

export default function Display({ initialOrders = [] }: Props) {
    const [orders, setOrders] = useState<LiveOrder[]>(initialOrders);

    // 1. New Order Placed[cite: 3]
    useEchoPublic('orders', '.order.placed', (e: any) => {
        setOrders((prev) => [e, ...prev]);
    });

    // 2. Order Status Updated[cite: 4]
    useEchoPublic('orders', '.order.status.updated', (e: any) => {
        setOrders((prev) =>
            prev.map((order) =>
                order.order_id === e.order_id
                    ? {
                          ...order,
                          order_status: e.order_status,
                          payment_status: e.payment_status,
                          has_juice_bar_items: e.has_juice_bar_items,
                      }
                    : order
            )
        );
    });

    // 3. Order Items Updated (Bulk)[cite: 2]
    useEchoPublic('orders', '.order.items.updated', (e: any) => {
        setOrders((prev) =>
            prev.map((order) =>
                order.order_id === e.order_id
                    ? {
                          ...order,
                          total_price: e.total_price,
                          items: e.items,
                      }
                    : order
            )
        );
    });

    // 4. Individual Order Item Status Updated[cite: 1]
    useEchoPublic('orders', '.order.item.status.updated', (e: any) => {
        setOrders((prev) =>
            prev.map((order) => {
                if (order.order_id === e.order_id) {
                    return {
                        ...order,
                        has_juice_bar_items: e.has_juice_bar_items,
                        items: order.items.map((item) =>
                            item.id === e.order_item_id
                                ? { ...item, status: e.status }
                                : item
                        ),
                    };
                }
                return order;
            })
        );
    });

    // Filter out completed or cancelled orders for the live view
    const activeOrders = orders.filter(
        (o) => o.order_status !== 'completed' && o.order_status !== 'cancelled'
    );

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Head title="Live Orders Display" />

            {/* A full-width container for maximum screen usage on TVs/Monitors */}
            <div className="mx-auto w-full max-w-[1920px] p-4 sm:p-6 lg:p-8 space-y-6">

                {/* Header Section */}
                <div className="flex items-center justify-between pb-4 border-b">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Live Kitchen Board</h1>
                        <p className="text-muted-foreground mt-1 text-lg">
                            Real-time order updates and status tracking
                        </p>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-lg py-1.5 px-4">
                        <span className="relative flex h-3 w-3 mr-3 items-center justify-center">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
                        </span>
                        Live Updates Active
                    </Badge>
                </div>

                {/* Orders Grid */}
                <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {activeOrders.map((order) => (
                        <Card key={order.order_id} className="border-t-4 border-t-primary shadow-md bg-card">
                            <CardHeader className="border-b bg-muted/30 pb-4 pt-5">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="font-mono text-2xl font-bold">
                                            {order.order_number}
                                        </CardTitle>
                                        <p className="mt-1.5 font-medium text-muted-foreground text-base">
                                            {order.table_name ?? (order.order_type ? order.order_type.replace('_', ' ') : 'Takeaway')}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2.5">
                                        <Badge variant="secondary" className="capitalize text-sm px-3 py-1">
                                            {order.order_status}
                                        </Badge>
                                        {order.has_juice_bar_items && (
                                            <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-600 text-sm px-2 py-0.5">
                                                Juice Bar
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-5">
                                {order.items && order.items.length > 0 ? (
                                    <div className="space-y-3">
                                        {order.items.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between rounded-lg bg-secondary/30 p-3 text-base"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="rounded border bg-background px-2.5 py-1 font-bold text-primary">
                                                        {item.quantity}x
                                                    </span>
                                                    <span className="font-medium text-foreground">{item.name}</span>
                                                </div>
                                                <Badge
                                                    variant={item.status === 'completed' ? 'default' : 'outline'}
                                                    className="text-xs capitalize"
                                                >
                                                    {item.status}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="py-4 text-center text-muted-foreground">
                                        No items available.
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}

                    {/* Empty State */}
                    {activeOrders.length === 0 && (
                        <div className="col-span-full rounded-2xl border-4 border-dashed py-24 text-center bg-muted/10">
                            <h2 className="text-2xl font-semibold text-muted-foreground">No active orders right now</h2>
                            <p className="mt-2 text-lg text-muted-foreground/70">Waiting for new orders to arrive...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
