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
    takeaway_price: number | null;
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

interface CustomCartLine {
    id: string;
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
    const [customItems, setCustomItems] = useState<CustomCartLine[]>([]);
    const [customItemName, setCustomItemName] = useState('');
    const [customItemPrice, setCustomItemPrice] = useState('');
    const [customItemQuantity, setCustomItemQuantity] = useState('1');
    const [processing, setProcessing] = useState(false);
    const activeCategory = categories[0]?.id ?? null;
    const [selectedCategory, setSelectedCategory] = useState<number | null>(activeCategory);

    // Takeaway orders use the item's takeaway_price when one is set.
    const getItemPrice = (item: Item) =>
        order.order_type === 'takeaway' && item.takeaway_price !== null
            ? Number(item.takeaway_price)
            : Number(item.price);

    const addToCart = (item: Item) => {
        const price = getItemPrice(item);
        setCart((prev) => {
            const existing = prev.find((line) => line.id === item.id);
            if (existing) {
                return prev.map((line) =>
                    line.id === item.id ? { ...line, quantity: line.quantity + 1 } : line
                );
            }
            return [...prev, { id: item.id, name: item.name, price, quantity: 1 }];
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

    const addCustomItem = () => {
        const name = customItemName.trim();
        const price = Number(customItemPrice);
        const quantity = Math.max(1, Number(customItemQuantity) || 1);

        if (!name || Number.isNaN(price) || price < 0) return;

        setCustomItems((prev) => {
            const existing = prev.find(
                (entry) => entry.name.toLowerCase() === name.toLowerCase() && entry.price === price,
            );

            if (existing) {
                return prev.map((entry) =>
                    entry.id === existing.id ? { ...entry, quantity: entry.quantity + quantity } : entry,
                );
            }

            return [...prev, { id: `custom-${Date.now()}`, name, price, quantity }];
        });

        setCustomItemName('');
        setCustomItemPrice('');
        setCustomItemQuantity('1');
    };

    const updateCustomQuantity = (id: string, quantity: number) => {
        if (quantity <= 0) {
            setCustomItems((prev) => prev.filter((entry) => entry.id !== id));
            return;
        }
        setCustomItems((prev) => prev.map((entry) => (entry.id === id ? { ...entry, quantity } : entry)));
    };

    const removeCustomItem = (id: string) => {
        setCustomItems((prev) => prev.filter((entry) => entry.id !== id));
    };

    const cartTotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const customTotal = customItems.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const combinedTotal = cartTotal + customTotal;

    const submit = () => {
        if (cart.length === 0 && customItems.length === 0) return;
        setProcessing(true);
        router.post(
            route('orders.add-items', order.id),
            {
                items: cart.map((line) => ({ id: line.id, quantity: line.quantity })),
                custom_items: customItems.map((line) => ({
                    name: line.name,
                    price: line.price,
                    quantity: line.quantity,
                })),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setCart([]);
                    setCustomItems([]);
                },
                onFinish: () => setProcessing(false),
            }
        );
    };

    const currentCategory = categories.find((c) => c.id === selectedCategory);
    const isTakeaway = order.order_type === 'takeaway';

    return (
        <AppLayout breadcrumbs={breadcrumbs(order.order_number)}>
            <Head title={`Add Items – ${order.order_number}`} />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold font-mono">{order.order_number}</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Add items to this order
                            {isTakeaway && (
                                <span className="ml-2 text-xs font-medium text-primary">
                                    (showing takeaway prices)
                                </span>
                            )}
                        </p>
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
                                        Rs. {getItemPrice(item).toFixed(2)}
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
                            {cart.length === 0 && customItems.length === 0 && (
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

                            {customItems.length > 0 && (
                                <div className="space-y-2 border-t pt-2">
                                    <p className="text-xs font-medium text-muted-foreground">One-time Items</p>
                                    {customItems.map((line) => (
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
                                                    onClick={() => updateCustomQuantity(line.id, line.quantity - 1)}
                                                >
                                                    −
                                                </Button>
                                                <span className="w-5 text-center">{line.quantity}</span>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => updateCustomQuantity(line.id, line.quantity + 1)}
                                                >
                                                    +
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeCustomItem(line.id)}
                                                >
                                                    ×
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* One-time / custom item form */}
                            <div className="rounded-md border bg-background p-3 space-y-2">
                                <div>
                                    <p className="text-sm font-medium">One-time Item</p>
                                    <p className="text-xs text-muted-foreground">
                                        Add a custom line item that is not in the item catalog.
                                    </p>
                                </div>
                                <input
                                    type="text"
                                    value={customItemName}
                                    onChange={(e) => setCustomItemName(e.target.value)}
                                    placeholder="Item name"
                                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={customItemPrice}
                                        onChange={(e) => setCustomItemPrice(e.target.value)}
                                        placeholder="Price"
                                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                    />
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={customItemQuantity}
                                        onChange={(e) => setCustomItemQuantity(e.target.value)}
                                        placeholder="Qty"
                                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                    />
                                </div>
                                <Button type="button" variant="outline" className="w-full" onClick={addCustomItem}>
                                    Add One-time Item
                                </Button>
                            </div>

                            {(cart.length > 0 || customItems.length > 0) && (
                                <div className="border-t pt-2 flex justify-between text-sm font-medium">
                                    <span>New items total</span>
                                    <span>Rs. {combinedTotal.toFixed(2)}</span>
                                </div>
                            )}
                            <Button
                                className="w-full"
                                disabled={(cart.length === 0 && customItems.length === 0) || processing}
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
