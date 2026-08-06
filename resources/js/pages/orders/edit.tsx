import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface Item {
    id: number;
    name: string;
    price: number;
}

interface Category {
    id: number;
    name: string;
    items: Item[];
}

interface OrderItem {
    id: number;
    item: Item | null;
    item_name?: string | null;
    quantity: number;
    price: number;
    orderItem_status: string;
}

interface Order {
    id: number;
    order_number: string;
    order_type: string;
    order_status: string;
    subtotal: number;
    discount: number;
    total_price: number;
    items: OrderItem[];
}

interface CartLine {
    id: number;
    name: string;
    price: number;
    quantity: number;
}

interface Props {
    order: Order;
    categories: Category[];
}

const breadcrumbs = (orderNumber: string): BreadcrumbItem[] => [
    { title: 'Orders', href: '/orders' },
    { title: orderNumber, href: '#' },
    { title: 'Add Items', href: '#' },
];

export default function OrderEdit({ order, categories }: Props) {
    const [cart, setCart] = useState<CartLine[]>([]);
    const [processing, setProcessing] = useState(false);
    const activeCategory = categories[0]?.id ?? null;
    const [selectedCategory, setSelectedCategory] = useState<number | null>(activeCategory);

    const addToCart = (item: Item) => {
        setCart((prev) => {
            const existing = prev.find((line) => line.id === item.id);
            if (existing) {
                return prev.map((line) =>
                    line.id === item.id ? { ...line, quantity: line.quantity + 1 } : line
                );
            }
            return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
        });
    };

    const updateQuantity = (id: number, quantity: number) => {
        if (quantity <= 0) {
            setCart((prev) => prev.filter((line) => line.id !== id));
            return;
        }
        setCart((prev) => prev.map((line) => (line.id === id ? { ...line, quantity } : line)));
    };

    const removeFromCart = (id: number) => {
        setCart((prev) => prev.filter((line) => line.id !== id));
    };

    const cartTotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);

    const submit = () => {
        if (cart.length === 0) return;
        setProcessing(true);
        router.post(
            route('orders.add-items', order.id),
            {
                items: cart.map((line) => ({ id: line.id, quantity: line.quantity })),
            },
            {
                preserveScroll: true,
                onSuccess: () => setCart([]),
                onFinish: () => setProcessing(false),
            }
        );
    };

    const currentCategory = categories.find((c) => c.id === selectedCategory);

    return (
        <AppLayout breadcrumbs={breadcrumbs(order.order_number)}>
            <Head title={`Add Items – ${order.order_number}`} />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold font-mono">{order.order_number}</h1>
                        <p className="text-sm text-muted-foreground mt-1">Add items to this order</p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href={route('orders.show', order.id)}>Back to Order</Link>
                    </Button>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    {/* Menu picker */}
                    <div className="lg:col-span-2 rounded-lg border bg-card">
                        <div className="flex gap-2 overflow-x-auto border-b p-3">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${
                                        selectedCategory === cat.id
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground'
                                    }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
                            {currentCategory?.items.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => addToCart(item)}
                                    className="flex flex-col items-start rounded-md border p-3 text-left hover:bg-muted/50"
                                >
                                    <span className="text-sm font-medium">{item.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                        Rs. {Number(item.price).toFixed(2)}
                                    </span>
                                </button>
                            ))}
                            {!currentCategory?.items.length && (
                                <p className="col-span-full text-sm text-muted-foreground">
                                    No items in this category.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Cart + existing items */}
                    <div className="space-y-4">
                        <div className="rounded-lg border bg-card p-4 space-y-3">
                            <h2 className="font-medium">Items to Add</h2>
                            {cart.length === 0 && (
                                <p className="text-sm text-muted-foreground">Tap an item to add it.</p>
                            )}
                            {cart.map((line) => (
                                <div key={line.id} className="flex items-center justify-between text-sm">
                                    <div>
                                        <p>{line.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Rs. {(line.price * line.quantity).toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => updateQuantity(line.id, line.quantity - 1)}
                                        >
                                            −
                                        </Button>
                                        <span className="w-5 text-center">{line.quantity}</span>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => updateQuantity(line.id, line.quantity + 1)}
                                        >
                                            +
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeFromCart(line.id)}
                                        >
                                            ×
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {cart.length > 0 && (
                                <div className="border-t pt-2 flex justify-between text-sm font-medium">
                                    <span>New items total</span>
                                    <span>Rs. {cartTotal.toFixed(2)}</span>
                                </div>
                            )}
                            <Button
                                className="w-full"
                                disabled={cart.length === 0 || processing}
                                onClick={submit}
                            >
                                {processing ? 'Adding…' : 'Add to Order'}
                            </Button>
                        </div>

                        <div className="rounded-lg border bg-card p-4 space-y-2">
                            <h2 className="font-medium mb-1">Current Items</h2>
                            {order.items.map((oi) => (
                                <div key={oi.id} className="flex items-center justify-between text-sm">
                                    <span>
                                        {oi.quantity}x {oi.item_name ?? oi.item?.name ?? '—'}
                                    </span>
                                    <Badge variant="outline" className="text-xs capitalize">
                                        {oi.orderItem_status}
                                    </Badge>
                                </div>
                            ))}
                            <div className="border-t pt-2 flex justify-between text-sm font-medium">
                                <span>Order total</span>
                                <span>Rs. {Number(order.total_price).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
