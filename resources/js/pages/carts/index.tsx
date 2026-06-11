import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

interface CartItem {
    id: number;
    quantity: number;
    item: { id: number; name: string; price: number } | null;
}

interface Cart {
    id: number;
    updated_at: string;
    user: { id: number; name: string } | null;
    table: { id: number; name: string } | null;
    items: CartItem[];
}

interface Props {
    carts: Cart[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Active Carts', href: '/carts' },
];

function cartTotal(items: CartItem[]): number {
    return items.reduce((sum, ci) => sum + (ci.item ? ci.item.price * ci.quantity : 0), 0);
}

export default function CartsIndex({ carts }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Active Carts" />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Active Carts</h1>
                    <Badge variant="outline">{carts.length} active</Badge>
                </div>

                {carts.length === 0 ? (
                    <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
                        No active carts at the moment.
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {carts.map((cart) => (
                            <div key={cart.id} className="rounded-lg border bg-card shadow-xs">
                                <div className="flex items-center justify-between border-b px-4 py-3">
                                    <div>
                                        <p className="font-medium">{cart.user?.name ?? 'Unknown user'}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {cart.table ? `Table: ${cart.table.name}` : 'No table'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground">Last updated</p>
                                        <p className="text-xs">{new Date(cart.updated_at).toLocaleTimeString()}</p>
                                    </div>
                                </div>

                                <div className="px-4 py-3">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-xs text-muted-foreground">
                                                <th className="pb-2 font-medium">Item</th>
                                                <th className="pb-2 font-medium text-center">Qty</th>
                                                <th className="pb-2 font-medium text-right">Price</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cart.items.map((ci) => (
                                                <tr key={ci.id} className="border-t">
                                                    <td className="py-1.5">{ci.item?.name ?? '—'}</td>
                                                    <td className="py-1.5 text-center">{ci.quantity}</td>
                                                    <td className="py-1.5 text-right">
                                                        Rs. {ci.item ? (ci.item.price * ci.quantity).toFixed(2) : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex items-center justify-between border-t px-4 py-3">
                                    <span className="text-sm text-muted-foreground">{cart.items.length} item(s)</span>
                                    <span className="font-medium text-sm">
                                        Rs. {cartTotal(cart.items).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
