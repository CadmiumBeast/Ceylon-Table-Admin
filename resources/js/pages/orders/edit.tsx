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
    uber_price: number | null;
    pickme_price: number | null;
}

interface Category {
    id: number;
    name: string;
    items: Item[];
}

interface TableRow {
    id: number;
    name: string;
    is_available: boolean;
}

interface Customer {
    id: number;
    name: string;
    phone: string | null;
}

interface OrderPaymentSplit {
    id: number;
    payment_method: string;
    amount: number;
}

interface OrderItem {
    id: number;
    item_id: number | null;
    item: Item | null;
    item_name?: string | null;
    is_custom_item: boolean;
    quantity: number;
    price: number;
    notes: string | null;
    orderItem_status: string;
}

interface Order {
    id: number;
    order_number: string;
    order_type: string;
    order_status: string;
    payment_status: string;
    table_id: number | null;
    user_id: number | null;
    subtotal: number;
    discount: number;
    total_price: number;
    items: OrderItem[];
    user: { id: number; name: string; customer?: { phone_number: string | null } | null } | null;
    payment_splits?: OrderPaymentSplit[];
}

interface Props {
    order: Order;
    categories: Category[];
    tables: TableRow[];
    customers: Customer[];
}

interface NewCartLine {
    id: number;
    name: string;
    basePrice: number;
    takeawayPrice: number | null;
    uberPrice: number | null;
    pickmePrice: number | null;
    quantity: number;
    notes: string | null;
}

interface NewCustomLine {
    id: string;
    name: string;
    price: number;
    quantity: number;
    notes: string | null;
}

// Local editable mirror of an existing (non-cancelled) order line
interface EditableExistingItem {
    id: number;
    is_custom_item: boolean;
    displayName: string;
    name: string; // editable, custom items only
    price: number; // editable, custom items only
    basePrice: number; // catalog price, for live re-pricing preview
    takeawayPrice: number | null;
    uberPrice: number | null;
    pickmePrice: number | null;
    quantity: number; // 0 = marked for cancellation
    notes: string;
    status: string;
}

const ORDER_TYPES = [
    { value: 'dine-in', label: 'Dine In' },
    { value: 'takeaway', label: 'Takeaway' },
    { value: 'delivery', label: 'Delivery' },
    { value: 'uber', label: 'Uber Eats' },
    { value: 'pickme', label: 'PickMe' },
] as const;

const PAYMENT_METHODS = ['Cash', 'Visa', 'Master', 'Uber', 'Pickme', 'Bank_Transfer'] as const;

const breadcrumbs = (orderNumber: string): BreadcrumbItem[] => [
    { title: 'Orders', href: '/orders' },
    { title: orderNumber, href: '#' },
    { title: 'Edit', href: '#' },
];

// Mirrors Item::priceForOrderType() on the backend.
function priceForOrderType(
    basePrice: number,
    takeawayPrice: number | null,
    uberPrice: number | null,
    pickmePrice: number | null,
    orderType: string)
    : number {
    if (orderType === 'uber') return uberPrice ?? takeawayPrice ?? basePrice;
    if (orderType === 'pickme') return pickmePrice ?? takeawayPrice ?? basePrice;
    if (orderType === 'takeaway' && takeawayPrice !== null) return takeawayPrice;
    return basePrice;
}


// Safely match the saved payment method against available options
function getInitialPaymentMethod(splits?: OrderPaymentSplit[]): string {
    if (!splits || splits.length === 0) return 'Cash';
    const savedMethod = splits[0].payment_method;
    const matchedMethod = PAYMENT_METHODS.find(
        (m) => m.toLowerCase() === savedMethod.toLowerCase() || m.toLowerCase() === savedMethod.toLowerCase().replace(' ', '_')
    );
    return matchedMethod ?? savedMethod;
}

export default function OrderEdit({ order, categories, tables, customers }: Props) {
    const isCancelled = order.order_status === 'cancelled';

    // ---- Order-level fields ----
    const [orderType, setOrderType] = useState<string>(order.order_type);
    const [tableId, setTableId] = useState<number | null>(order.table_id);
    const [userId, setUserId] = useState<number | null>(order.user_id);
    const [customerName, setCustomerName] = useState(order.user?.name ?? '');
    const [phoneSearch, setPhoneSearch] = useState(order.user?.customer?.phone_number ?? '');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [discount, setDiscount] = useState<string>(String(order.discount ?? 0));
    const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>(
        order.payment_status === 'paid' ? 'paid' : 'pending',
    );
    const [paymentMethod, setPaymentMethod] = useState<string>(getInitialPaymentMethod(order.payment_splits));

    // ---- Existing (non-cancelled) items — editable ----
    const [existingItems, setExistingItems] = useState<EditableExistingItem[]>(
        order.items
            .filter((oi) => oi.orderItem_status !== 'cancelled')
            .map((oi) => ({
                id: oi.id,
                is_custom_item: oi.is_custom_item,
                displayName: oi.item_name ?? oi.item?.name ?? 'Unknown Item',
                name: oi.item_name ?? oi.item?.name ?? '',
                price: Number(oi.price),
                basePrice: oi.item ? Number(oi.item.price) : Number(oi.price),
                takeawayPrice: oi.item?.takeaway_price != null ? Number(oi.item.takeaway_price) : null,
                uberPrice: oi.item?.uber_price != null ? Number(oi.item.uber_price) : null,
                pickmePrice: oi.item?.pickme_price != null ? Number(oi.item.pickme_price) : null,
                quantity: oi.quantity,
                notes: oi.notes ?? '',
                status: oi.orderItem_status,
            })),
    );

    // Already-cancelled items — shown read-only, never resubmitted.
    const cancelledItems = order.items.filter((oi) => oi.orderItem_status === 'cancelled');

    // ---- New items being added ----
    const activeCategory = categories[0]?.id ?? null;
    const [selectedCategory, setSelectedCategory] = useState<number | null>(activeCategory);
    const [itemSearch, setItemSearch] = useState('');
    const [cart, setCart] = useState<NewCartLine[]>([]);
    const [customItems, setCustomItems] = useState<NewCustomLine[]>([]);
    const [customItemName, setCustomItemName] = useState('');
    const [customItemPrice, setCustomItemPrice] = useState('');
    const [customItemQuantity, setCustomItemQuantity] = useState('1');

    const [processing, setProcessing] = useState(false);

    const phoneSuggestions = phoneSearch.length >= 2
        ? customers.filter((c) => c.phone && c.phone.includes(phoneSearch))
        : [];

    // ---- Existing item mutators ----
    const updateExistingQty = (id: number, quantity: number) => {
        setExistingItems((prev) =>
            prev.map((e) => (e.id === id ? { ...e, quantity: Math.max(0, quantity) } : e)),
        );
    };

    const cancelExistingItem = (id: number) => {
        setExistingItems((prev) => prev.map((e) => (e.id === id ? { ...e, quantity: 0 } : e)));
    };

    const restoreExistingItem = (id: number) => {
        setExistingItems((prev) => prev.map((e) => (e.id === id ? { ...e, quantity: 1 } : e)));
    };

    const updateExistingNotes = (id: number, notes: string) => {
        setExistingItems((prev) => prev.map((e) => (e.id === id ? { ...e, notes } : e)));
    };

    const updateExistingName = (id: number, name: string) => {
        setExistingItems((prev) => prev.map((e) => (e.id === id ? { ...e, name } : e)));
    };

    const updateExistingPrice = (id: number, price: number) => {
        setExistingItems((prev) => prev.map((e) => (e.id === id ? { ...e, price } : e)));
    };

    // ---- New item cart mutators ----
    const addToCart = (item: Item) => {
        setCart((prev) => {
            const existing = prev.find((line) => line.id === item.id);
            if (existing) {
                return prev.map((line) =>
                    line.id === item.id ? { ...line, quantity: line.quantity + 1 } : line,
                );
            }
            return [
                ...prev,
                {
                    id: item.id,
                    name: item.name,
                    basePrice: Number(item.price),
                    takeawayPrice: item.takeaway_price != null ? Number(item.takeaway_price) : null,
                    uberPrice: item.uber_price != null ? Number(item.uber_price) : null,
                    pickmePrice: item.pickme_price != null ? Number(item.pickme_price) : null,
                    quantity: 1,
                    notes: null,
                },
            ];
        });
    };

    const updateCartQty = (id: number, quantity: number) => {
        if (quantity <= 0) {
            setCart((prev) => prev.filter((line) => line.id !== id));
            return;
        }
        setCart((prev) => prev.map((line) => (line.id === id ? { ...line, quantity } : line)));
    };

    const removeCartLine = (id: number) => setCart((prev) => prev.filter((line) => line.id !== id));

    const addCustomItem = () => {
        const name = customItemName.trim();
        const price = Number(customItemPrice);
        const quantity = Math.max(1, Number(customItemQuantity) || 1);
        if (!name || Number.isNaN(price) || price < 0) return;

        setCustomItems((prev) => [
            ...prev,
            { id: `custom-${Date.now()}`, name, price, quantity, notes: null },
        ]);
        setCustomItemName('');
        setCustomItemPrice('');
        setCustomItemQuantity('1');
    };

    const updateCustomQty = (id: string, quantity: number) => {
        if (quantity <= 0) {
            setCustomItems((prev) => prev.filter((entry) => entry.id !== id));
            return;
        }
        setCustomItems((prev) => prev.map((entry) => (entry.id === id ? { ...entry, quantity } : entry)));
    };

    const removeCustomLine = (id: string) => setCustomItems((prev) => prev.filter((entry) => entry.id !== id));

    // ---- Live totals preview (mirrors backend pricing logic) ----
    const existingItemLivePrice = (line: EditableExistingItem) =>
    line.is_custom_item
        ? line.price
        : priceForOrderType(line.basePrice, line.takeawayPrice, line.uberPrice, line.pickmePrice, orderType);

    const existingTotal = existingItems.reduce(
        (sum, e) => sum + existingItemLivePrice(e) * e.quantity,
        0,
    );
    const newCartTotal = cart.reduce(
        (sum, l) => sum + priceForOrderType(l.basePrice, l.takeawayPrice, l.uberPrice, l.pickmePrice, orderType) * l.quantity,
        0,
    );
    const newCustomTotal = customItems.reduce((sum, l) => sum + l.price * l.quantity, 0);
    const discountNum = Math.max(0, parseFloat(discount) || 0);
    const projectedSubtotal = existingTotal + newCartTotal + newCustomTotal;
    const projectedTotal = Math.max(0, projectedSubtotal - discountNum);

    const displayedItems = itemSearch.trim()
        ? categories.flatMap((c) => c.items).filter((i) => i.name.toLowerCase().includes(itemSearch.toLowerCase()))
        : (categories.find((c) => c.id === selectedCategory)?.items ?? []);

    const hasAnyActiveLine = existingItems.some((e) => e.quantity > 0) || cart.length > 0 || customItems.length > 0;
    const canSubmit = !isCancelled && (orderType !== 'dine_in' || tableId !== null) && hasAnyActiveLine;


    const handleSave = () => {
        if (processing || !canSubmit) return;
        setProcessing(true);

        router.put(
            route('orders.update', order.id),
            {
                order_type: orderType,
                table_id: orderType === 'dine_in' ? tableId : null,
                user_id: userId,
                customer_name: customerName || undefined,
                customer_phone: userId === null ? (phoneSearch || undefined) : undefined,
                discount: discountNum,
                payment_status: paymentStatus,
                payment_method: paymentStatus === 'paid' ? paymentMethod : null,
                existing_items: existingItems.map((e) => ({
                    id: e.id,
                    quantity: e.quantity,
                    notes: e.notes,
                    ...(e.is_custom_item ? { name: e.name, price: e.price } : {}),
                })),
                new_items: cart.map((l) => ({ id: l.id, quantity: l.quantity, notes: l.notes })),
                new_custom_items: customItems.map((l) => ({
                    name: l.name,
                    price: l.price,
                    quantity: l.quantity,
                    notes: l.notes,
                })),
            },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs(order.order_number)}>
            <Head title={`Edit Order – ${order.order_number}`} />

            <div className="mx-auto w-full max-w-[1920px] space-y-6 p-4 sm:p-6 lg:p-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold font-mono tracking-tight">{order.order_number}</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Edit this order</p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href={route('orders.show', order.id)}>Back to Order</Link>
                    </Button>
                </div>

                {isCancelled && (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                        This order is cancelled and can no longer be edited.
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-4 xl:grid-cols-5 lg:items-start">
                    {/* Left/middle: order setup, customer, existing items, add items */}
                    <div className="space-y-6 lg:col-span-3 xl:col-span-4">
                        {/* Order setup */}
                        <section className="rounded-xl border bg-card p-5 space-y-4">
                            <h2 className="font-semibold">Order Setup</h2>

                            <div>
                                <p className="mb-2 text-sm font-medium text-muted-foreground">Order Type</p>
                                <div className="flex flex-wrap gap-2">
                                    {ORDER_TYPES.map((t) => (
                                        <button
                                            key={t.value}
                                            type="button"
                                            disabled={isCancelled}
                                            onClick={() => {
                                                setOrderType(t.value);
                                                if (t.value !== 'dine_in') setTableId(null);
                                            }}
                                            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                                                orderType === t.value
                                                    ? 'border-primary bg-primary/10 text-primary'
                                                    : 'hover:bg-muted'
                                            }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {orderType === 'dine_in' && (
                                <div>
                                    <p className="mb-2 text-sm font-medium text-muted-foreground">Table</p>
                                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
                                        {tables.map((t) => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                disabled={isCancelled || (!t.is_available && tableId !== t.id)}
                                                onClick={() => setTableId(t.id)}
                                                className={`rounded-lg border p-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                                                    tableId === t.id
                                                        ? 'border-primary bg-primary/10 text-primary'
                                                        : 'hover:bg-muted'
                                                }`}
                                            >
                                                {t.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>

                        <div className="grid gap-6 lg:grid-cols-2">
                            {/* Customer */}
                            <section className="rounded-xl border bg-card p-5 space-y-3">
                                <h2 className="font-semibold">Customer</h2>

                                <div className="grid gap-3">
                                    <div className="relative">
                                        <label className="mb-1 block text-sm font-medium text-muted-foreground">
                                            Phone Number
                                        </label>
                                        <input
                                            type="tel"
                                            disabled={isCancelled}
                                            value={phoneSearch}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setPhoneSearch(val);
                                                setShowSuggestions(true);
                                                if (val === '') {
                                                    setUserId(null);
                                                    setCustomerName('');
                                                }
                                            }}
                                            onFocus={() => setShowSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                        />
                                        {showSuggestions && phoneSuggestions.length > 0 && (
                                            <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-background text-sm shadow-md">
                                                {phoneSuggestions.map((c) => (
                                                    <li
                                                        key={c.id}
                                                        onMouseDown={() => {
                                                            setUserId(c.id);
                                                            setCustomerName(c.name);
                                                            setPhoneSearch(c.phone ?? '');
                                                            setShowSuggestions(false);
                                                        }}
                                                        className="cursor-pointer px-3 py-2 hover:bg-muted"
                                                    >
                                                        <span className="font-medium">{c.phone}</span>
                                                        <span className="ml-2 text-muted-foreground">{c.name}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-muted-foreground">
                                            Customer Name
                                        </label>
                                        <input
                                            type="text"
                                            disabled={isCancelled}
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Existing items */}
                            <section className="rounded-xl border bg-card p-5 space-y-3">
                                <h2 className="font-semibold">Current Items</h2>
                                {existingItems.length === 0 && (
                                    <p className="text-sm text-muted-foreground">No active items on this order.</p>
                                )}

                                <div className="space-y-2">
                                    {existingItems.map((line) => {
                                        const marked = line.quantity === 0;
                                        const livePrice = existingItemLivePrice(line);
                                        return (
                                            <div
                                                key={line.id}
                                                className={`rounded-lg border p-3 text-sm space-y-2 transition-colors ${
                                                    marked ? 'border-dashed bg-muted/40 opacity-60' : 'bg-background'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    {line.is_custom_item ? (
                                                        <input
                                                            type="text"
                                                            disabled={isCancelled || marked}
                                                            value={line.name}
                                                            onChange={(e) => updateExistingName(line.id, e.target.value)}
                                                            className="flex-1 rounded-md border bg-background px-2 py-1 text-sm font-medium"
                                                        />
                                                    ) : (
                                                        <p className={`font-medium ${marked ? 'line-through' : ''}`}>
                                                            {line.displayName}
                                                        </p>
                                                    )}
                                                    <Badge variant="outline" className="shrink-0 text-xs capitalize">
                                                        {marked ? 'cancelling' : line.status}
                                                    </Badge>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-3">
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            disabled={isCancelled || marked}
                                                            onClick={() => updateExistingQty(line.id, line.quantity - 1)}
                                                            className="h-6 w-6 rounded border text-center text-sm hover:bg-muted disabled:opacity-50"
                                                        >
                                                            −
                                                        </button>
                                                        <span className="w-6 text-center">{line.quantity}</span>
                                                        <button
                                                            type="button"
                                                            disabled={isCancelled || marked}
                                                            onClick={() => updateExistingQty(line.id, line.quantity + 1)}
                                                            className="h-6 w-6 rounded border text-center text-sm hover:bg-muted disabled:opacity-50"
                                                        >
                                                            +
                                                        </button>
                                                    </div>

                                                    {line.is_custom_item ? (
                                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                            Rs.
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                disabled={isCancelled || marked}
                                                                value={line.price}
                                                                onChange={(e) =>
                                                                    updateExistingPrice(line.id, Number(e.target.value) || 0)
                                                                }
                                                                className="w-20 rounded-md border bg-background px-2 py-1 text-sm"
                                                            />
                                                            each
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-muted-foreground">
                                                            Rs. {livePrice.toFixed(2)} each
                                                        </p>
                                                    )}

                                                    <p className="ml-auto text-xs font-medium">
                                                        Rs. {(livePrice * line.quantity).toFixed(2)}
                                                    </p>

                                                    {!isCancelled &&
                                                        (marked ? (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => restoreExistingItem(line.id)}
                                                            >
                                                                Undo
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => cancelExistingItem(line.id)}
                                                            >
                                                                Cancel item
                                                            </Button>
                                                        ))}
                                                </div>

                                                {!marked && (
                                                    <input
                                                        type="text"
                                                        disabled={isCancelled}
                                                        value={line.notes}
                                                        onChange={(e) => updateExistingNotes(line.id, e.target.value)}
                                                        placeholder="Notes"
                                                        className="w-full rounded-md border bg-background px-2 py-1 text-xs"
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {cancelledItems.length > 0 && (
                                    <div className="space-y-2 border-t pt-3">
                                        <p className="text-xs font-medium text-muted-foreground">
                                            Cancelled ({cancelledItems.length})
                                        </p>
                                        {cancelledItems.map((oi) => (
                                            <div
                                                key={oi.id}
                                                className="flex items-center justify-between rounded-md border border-dashed p-2 text-xs text-muted-foreground"
                                            >
                                                <span className="line-through">
                                                    {oi.quantity}x {oi.item_name ?? oi.item?.name ?? 'Unknown Item'}
                                                </span>
                                                <Badge variant="outline" className="text-xs">
                                                    cancelled
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* Add new items */}
                        <section className="rounded-xl border bg-card overflow-hidden">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 pb-0 gap-4">
                                <h2 className="font-semibold">Add Items</h2>
                                <input
                                    type="text"
                                    placeholder="Search all items..."
                                    disabled={isCancelled}
                                    value={itemSearch}
                                    onChange={(e) => setItemSearch(e.target.value)}
                                    className="w-full sm:w-64 rounded-md border bg-background px-3 py-1.5 text-sm"
                                />
                            </div>

                            {!itemSearch.trim() && (
                                <div className="flex gap-2 overflow-x-auto border-b p-3 mt-4">
                                    {categories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            disabled={isCancelled}
                                            onClick={() => setSelectedCategory(cat.id)}
                                            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm disabled:opacity-50 ${
                                                selectedCategory === cat.id
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground'
                                            }`}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className={`grid gap-3 p-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 ${itemSearch.trim() ? 'mt-4 border-t' : ''}`}>
                                {displayedItems.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        disabled={isCancelled}
                                        onClick={() => addToCart(item)}
                                        className="flex flex-col items-start rounded-lg border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50"
                                    >
                                        <span className="text-sm font-medium">{item.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            Rs. {priceForOrderType(Number(item.price), item.takeaway_price != null ? Number(item.takeaway_price) : null, item.uber_price != null ? Number(item.uber_price) : null, item.pickme_price != null ? Number(item.pickme_price) : null, orderType).toFixed(2)}
                                        </span>
                                    </button>
                                ))}
                                {!displayedItems.length && (
                                    <p className="col-span-full text-sm text-muted-foreground">
                                        {itemSearch.trim() ? 'No items found matching your search.' : 'No items in this category.'}
                                    </p>
                                )}
                            </div>

                            {(cart.length > 0 || customItems.length > 0) && (
                                <div className="space-y-2 border-t p-4">
                                    {cart.map((line) => (
                                        <div key={line.id} className="flex items-center justify-between text-sm">
                                            <div>
                                                <p>{line.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Rs. {(priceForOrderType(line.basePrice, line.takeawayPrice, line.uberPrice, line.pickmePrice, orderType) * line.quantity).toFixed(2)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button type="button" variant="outline" size="sm" onClick={() => updateCartQty(line.id, line.quantity - 1)}>
                                                    −
                                                </Button>
                                                <span className="w-5 text-center">{line.quantity}</span>
                                                <Button type="button" variant="outline" size="sm" onClick={() => updateCartQty(line.id, line.quantity + 1)}>
                                                    +
                                                </Button>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => removeCartLine(line.id)}>
                                                    ×
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {customItems.map((line) => (
                                        <div key={line.id} className="flex items-center justify-between text-sm">
                                            <div>
                                                <p>{line.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Rs. {(line.price * line.quantity).toFixed(2)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button type="button" variant="outline" size="sm" onClick={() => updateCustomQty(line.id, line.quantity - 1)}>
                                                    −
                                                </Button>
                                                <span className="w-5 text-center">{line.quantity}</span>
                                                <Button type="button" variant="outline" size="sm" onClick={() => updateCustomQty(line.id, line.quantity + 1)}>
                                                    +
                                                </Button>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => removeCustomLine(line.id)}>
                                                    ×
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-2 border-t p-4">
                                <p className="text-sm font-medium">One-time Item</p>
                                <div className="grid gap-2 sm:grid-cols-4">
                                    <input
                                        type="text"
                                        disabled={isCancelled}
                                        value={customItemName}
                                        onChange={(e) => setCustomItemName(e.target.value)}
                                        placeholder="Item name"
                                        className="sm:col-span-2 rounded-md border bg-background px-3 py-2 text-sm"
                                    />
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        disabled={isCancelled}
                                        value={customItemPrice}
                                        onChange={(e) => setCustomItemPrice(e.target.value)}
                                        placeholder="Price"
                                        className="rounded-md border bg-background px-3 py-2 text-sm"
                                    />
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        disabled={isCancelled}
                                        value={customItemQuantity}
                                        onChange={(e) => setCustomItemQuantity(e.target.value)}
                                        placeholder="Qty"
                                        className="rounded-md border bg-background px-3 py-2 text-sm"
                                    />
                                </div>
                                <Button type="button" variant="outline" className="w-full" disabled={isCancelled} onClick={addCustomItem}>
                                    Add One-time Item
                                </Button>
                            </div>
                        </section>
                    </div>

                    {/* Right: payment + summary + save */}
                    <div className="space-y-6 lg:col-span-1 xl:col-span-1 lg:sticky lg:top-6">
                        <section className="rounded-xl border bg-card p-5 space-y-3">
                            <h2 className="font-semibold">Payment</h2>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-muted-foreground">Status</label>
                                <div className="flex gap-2">
                                    {(['pending', 'paid'] as const).map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            disabled={isCancelled}
                                            onClick={() => setPaymentStatus(s)}
                                            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors disabled:opacity-50 ${
                                                paymentStatus === s
                                                    ? 'border-primary bg-primary/10 text-primary'
                                                    : 'hover:bg-muted'
                                            }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {paymentStatus === 'paid' && (
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-muted-foreground">
                                        Method
                                    </label>
                                    <select
                                        disabled={isCancelled}
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                    >
                                        {!PAYMENT_METHODS.some((m) => m === paymentMethod) && (
                                            <option value={paymentMethod}>{paymentMethod.replace('_', ' ')}</option>
                                        )}
                                        {PAYMENT_METHODS.map((m) => (
                                            <option key={m} value={m}>
                                                {m.replace('_', ' ')}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </section>

                        <section className="rounded-xl border bg-card p-5 space-y-3">
                            <h2 className="font-semibold">Summary</h2>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-muted-foreground">
                                    Discount (Rs.)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    disabled={isCancelled}
                                    value={discount}
                                    onChange={(e) => setDiscount(e.target.value)}
                                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                />
                            </div>

                            <div className="space-y-1 border-t pt-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>Rs. {projectedSubtotal.toFixed(2)}</span>
                                </div>
                                {discountNum > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Discount</span>
                                        <span>− Rs. {discountNum.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold">
                                    <span>Total</span>
                                    <span>Rs. {projectedTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            <Button className="w-full" disabled={!canSubmit || processing} onClick={handleSave}>
                                {processing ? 'Saving…' : 'Save Changes'}
                            </Button>
                            {!canSubmit && !isCancelled && (
                                <p className="text-center text-xs text-muted-foreground">
                                    {orderType === 'dine_in' && tableId === null
                                        ? 'Select a table to continue.'
                                        : 'Add at least one item to save.'}
                                </p>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
