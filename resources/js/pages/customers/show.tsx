// resources/js/pages/customers/show.tsx
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

                {/* Orders */}
                <div>
                    <h2 className="mb-3 text-lg font-semibold">Order History</h2>
                    <div className="overflow-x-auto rounded-lg border bg-card shadow-xs">
                        <table className="w-full min-w-[800px] text-sm">
                            <thead className="bg-muted/40 text-left">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Order #</th>
                                    <th className="px-4 py-3 font-medium">Type</th>
                                    <th className="px-4 py-3 font-medium">Table</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium">Payment</th>
                                    <th className="px-4 py-3 font-medium">Total</th>
                                    <th className="px-4 py-3 font-medium">Date</th>
                                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                                            No orders yet.
                                        </td>
                                    </tr>
                                ) : (
                                    orders.map((o) => (
                                        <tr key={o.id} className="border-t">
                                            <td className="px-4 py-3 font-medium">{o.order_number}</td>
                                            <td className="px-4 py-3 capitalize">{o.order_type.replace('_', ' ')}</td>
                                            <td className="px-4 py-3">{o.table?.name ?? '—'}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant={statusVariant(o.order_status)}>{o.order_status}</Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={statusVariant(o.payment_status)}>{o.payment_status}</Badge>
                                            </td>
                                            <td className="px-4 py-3">Rs. {parseFloat(o.total_price).toFixed(2)}</td>
                                            <td className="px-4 py-3">{new Date(o.created_at).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 text-right">
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={route('orders.show', o.id)}>View</Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
