import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

interface CustomerProfile {
    first_name: string;
    last_name: string;
    phone_number: string;
    address: string | null;
    date_of_birth: string | null;
    loyalty_points: number;
}

interface Customer {
    id: number;
    name: string;
    email: string;
    created_at: string;
    customer: CustomerProfile | null;
}

interface OrderItem {
    id: number;
    item_name: string;
    quantity: number;
    price: string;
    notes: string | null;
    orderItem_status: string;
}

interface PaymentSplit {
    id: number;
    payment_method: string;
    amount: string;
}

interface Order {
    id: number;
    order_number: string;
    order_type: string;
    order_status: string;
    payment_status: string;
    subtotal: string;
    discount: string;
    total_price: string;
    created_at: string;
    table: { name: string } | null;
    items: OrderItem[];
    paymentSplits: PaymentSplit[];
}

interface CustomersShowProps {
    customer: Customer;
    orders: Order[];
}

const statusVariant = (status: string) => {
    switch (status) {
        case 'completed':
        case 'paid':
            return 'default';
        case 'cancelled':
            return 'destructive';
        default:
            return 'secondary';
    }
};

const itemStatusVariant = (status: string) => {
    switch (status) {
        case 'served':
        case 'ready':
            return 'default';
        case 'cancelled':
            return 'destructive';
        default:
            return 'secondary';
    }
};

export default function CustomersShow({ customer, orders }: CustomersShowProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Customers', href: '/customers' },
        { title: customer.customer ? `${customer.customer.first_name} ${customer.customer.last_name}` : customer.name, href: '#' },
    ];

    const displayName = customer.customer
        ? `${customer.customer.first_name} ${customer.customer.last_name}`
        : customer.name;

    const totalSpent = orders
        .filter((o) => o.payment_status === 'paid')
        .reduce((sum, o) => sum + parseFloat(o.total_price), 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={displayName} />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">{displayName}</h1>
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href={route('customers.edit', customer.id)}>Edit</Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href={route('customers.index')}>Back</Link>
                        </Button>
                    </div>
                </div>

                {/* Profile details */}
                <div className="grid grid-cols-1 gap-4 rounded-lg border bg-card p-4 shadow-xs sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium">{customer.email}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-medium">{customer.customer?.phone_number ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Address</p>
                        <p className="font-medium">{customer.customer?.address ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Date of Birth</p>
                        <p className="font-medium">
                            {customer.customer?.date_of_birth
                                ? new Date(customer.customer.date_of_birth).toLocaleDateString()
                                : '—'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Joined</p>
                        <p className="font-medium">{new Date(customer.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Loyalty Points</p>
                        <p className="font-medium">{customer.customer?.loyalty_points ?? 0}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Total Orders</p>
                        <p className="font-medium">{orders.length}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Total Spent</p>
                        <p className="font-medium">Rs. {totalSpent.toFixed(2)}</p>
                    </div>
                </div>

                {/* Orders — full detail card grid */}
                <div>
                    <h2 className="mb-3 text-lg font-semibold">Order History</h2>

                    {orders.length === 0 ? (
                        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground shadow-xs">
                            No orders yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {orders.map((o) => (
                                <div
                                    key={o.id}
                                    className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-xs"
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-semibold">{o.order_number}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(o.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <Badge variant={statusVariant(o.order_status)}>{o.order_status}</Badge>
                                            <Badge variant={statusVariant(o.payment_status)}>{o.payment_status}</Badge>
                                        </div>
                                    </div>

                                    {/* Meta */}
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Type</p>
                                            <p className="capitalize">{o.order_type.replace('_', ' ')}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Table</p>
                                            <p>{o.table?.name ?? '—'}</p>
                                        </div>
                                    </div>

                                    {/* Items */}
                                    <div className="space-y-1.5 border-t pt-3">
                                        <p className="text-xs font-medium text-muted-foreground">Items</p>
                                        {o.items.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No items.</p>
                                        ) : (
                                            <ul className="space-y-1.5">
                                                {o.items.map((item) => (
                                                    <li
                                                        key={item.id}
                                                        className="flex items-center justify-between gap-2 text-sm"
                                                    >
                                                        <span className="flex items-center gap-1.5 truncate">
                                                            <span className="text-muted-foreground">{item.quantity}×</span>
                                                            <span className="truncate">{item.item_name}</span>
                                                            {item.orderItem_status === 'cancelled' && (
                                                                <Badge variant={itemStatusVariant(item.orderItem_status)} className="ml-1 shrink-0 text-[10px]">
                                                                    cancelled
                                                                </Badge>
                                                            )}
                                                        </span>
                                                        <span className="shrink-0 tabular-nums text-muted-foreground">
                                                            Rs. {(parseFloat(item.price) * item.quantity).toFixed(2)}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    {/* Payment splits */}
                                    {o.paymentSplits.length > 0 && (
                                        <div className="space-y-1.5 border-t pt-3">
                                            <p className="text-xs font-medium text-muted-foreground">Payment</p>
                                            <ul className="space-y-1">
                                                {o.paymentSplits.map((p) => (
                                                    <li key={p.id} className="flex items-center justify-between text-sm">
                                                        <span>{p.payment_method.replace('_', ' ')}</span>
                                                        <span className="tabular-nums">Rs. {parseFloat(p.amount).toFixed(2)}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Totals */}
                                    <div className="space-y-1 border-t pt-3 text-sm">
                                        <div className="flex items-center justify-between text-muted-foreground">
                                            <span>Subtotal</span>
                                            <span className="tabular-nums">Rs. {parseFloat(o.subtotal).toFixed(2)}</span>
                                        </div>
                                        {parseFloat(o.discount) > 0 && (
                                            <div className="flex items-center justify-between text-muted-foreground">
                                                <span>Discount</span>
                                                <span className="tabular-nums">- Rs. {parseFloat(o.discount).toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between font-semibold">
                                            <span>Total</span>
                                            <span className="tabular-nums">Rs. {parseFloat(o.total_price).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <Button variant="outline" size="sm" asChild className="mt-auto">
                                        <Link href={route('orders.show', o.id)}>View Full Order</Link>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
