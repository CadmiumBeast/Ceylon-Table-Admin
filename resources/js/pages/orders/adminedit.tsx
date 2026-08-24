import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { useState, useMemo } from 'react';

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
    item_id: number | null;
    item: Item | null;
    item_name?: string | null;
    quantity: number;
    price: number;
    orderItem_status: string;
    is_custom_item: boolean;
    notes?: string | null;
}

interface OrderPaymentSplit {
    id: number;
    payment_method: string;
    amount: number;
}

interface Order {
    id: number;
    order_number: string;
    order_type: string;
    order_status: string;
    payment_status: string;
    subtotal: number;
    discount: number;
    total_price: number;
    table_id: number | null;
    user_id: number | null;
    items: OrderItem[];
    paymentSplits?: OrderPaymentSplit[]; // Added
    user?: {
        id: number;
        customer?: {
            first_name: string;
            last_name: string;
            phone_number: string;
        };
    };
}

interface Table {
    id: number;
    name: string;
    is_active: boolean;
}

interface Customer {
    id: number;
    name: string;
    phone?: string;
}

interface PreparedStockEntry {
    quantity: number;
    item_name: string;
}

interface Props {
    order: Order;
    categories: Category[];
    tables: Table[];
    customers: Customer[];
    preparedStock: Record<number, PreparedStockEntry>;
}

export default function AdminOrderEdit({ order, categories, tables, customers, preparedStock }: Props) {
    const activeCategory = categories[0]?.id ?? null;
    const [selectedCategory, setSelectedCategory] = useState<number | null>(activeCategory);

    const [customItemName, setCustomItemName] = useState('');
    const [customItemPrice, setCustomItemPrice] = useState('');
    const [customItemQuantity, setCustomItemQuantity] = useState('1');

    const { data, setData, put, processing, errors } = useForm({
        order_type: order.order_type,
        payment_status: order.payment_status || 'pending',
        payment_method: order.paymentSplits?.[0]?.payment_method || 'Cash', // Default to existing split or Cash
        table_id: order.table_id || '',
        user_id: order.user_id || '',
        customer_name: order.user?.customer?.first_name || '',
        customer_phone: order.user?.customer?.phone_number || '',
        discount: order.discount || 0,

        existing_items: order.items.map((i) => ({
            id: i.id,
            quantity: i.quantity,
            notes: i.notes || '',
            name: i.is_custom_item ? i.item_name || '' : undefined,
            price: i.is_custom_item ? i.price : undefined,
            _name: i.item_name || i.item?.name || 'Unknown Item',
            _original_price: Number(i.price),
            _is_custom: i.is_custom_item,
            _item_id: i.item_id,
            _status: i.orderItem_status,
        })),

        new_items: [] as Array<{
            id: number;
            quantity: number;
            notes: string;
            _name: string;
            _base_price: number;
            _takeaway_price: number | null;
        }>,

        new_custom_items: [] as Array<{
            id: string;
            name: string;
            price: number;
            quantity: number;
            notes: string;
        }>,
    });

    const isTakeaway = data.order_type === 'takeaway';

    const getDynamicItemPrice = (basePrice: number, takeawayPrice: number | null) => {
        return isTakeaway && takeawayPrice !== null ? Number(takeawayPrice) : Number(basePrice);
    };

    // --- State Mutations ---
    const addToCart = (item: Item) => {
        const existing = data.new_items.find((line) => line.id === item.id);
        if (existing) {
            setData('new_items', data.new_items.map((line) =>
                line.id === item.id ? { ...line, quantity: line.quantity + 1 } : line
            ));
        } else {
            setData('new_items', [
                ...data.new_items,
                {
                    id: item.id,
                    quantity: 1,
                    notes: '',
                    _name: item.name,
                    _base_price: item.price,
                    _takeaway_price: item.takeaway_price,
                },
            ]);
        }
    };

    const updateNewItemQuantity = (id: number, quantity: number) => {
        if (quantity <= 0) {
            setData('new_items', data.new_items.filter((line) => line.id !== id));
            return;
        }
        setData('new_items', data.new_items.map((line) => (line.id === id ? { ...line, quantity } : line)));
    };

    const updateExistingQuantity = (id: number, quantity: number) => {
        setData('existing_items', data.existing_items.map((item) =>
            item.id === id ? { ...item, quantity: Math.max(0, quantity) } : item
        ));
    };

    const addCustomItem = () => {
        const name = customItemName.trim();
        const price = Number(customItemPrice);
        const quantity = Math.max(1, Number(customItemQuantity) || 1);

        if (!name || Number.isNaN(price) || price < 0) return;

        setData('new_custom_items', [
            ...data.new_custom_items,
            { id: `custom-${Date.now()}`, name, price, quantity, notes: '' },
        ]);

        setCustomItemName('');
        setCustomItemPrice('');
        setCustomItemQuantity('1');
    };

    const updateCustomQuantity = (id: string, quantity: number) => {
        if (quantity <= 0) {
            setData('new_custom_items', data.new_custom_items.filter((entry) => entry.id !== id));
            return;
        }
        setData('new_custom_items', data.new_custom_items.map((entry) =>
            entry.id === id ? { ...entry, quantity } : entry
        ));
    };

    // --- Calculations ---
    const currentTotal = useMemo(() => {
        let total = 0;

        data.existing_items.forEach((item) => {
            if (item.quantity > 0) {
                let price = item._original_price;
                if (!item._is_custom && item._item_id && order.order_type !== data.order_type) {
                    const catalogItem = categories.flatMap(c => c.items).find(i => i.id === item._item_id);
                    if (catalogItem) {
                        price = getDynamicItemPrice(catalogItem.price, catalogItem.takeaway_price);
                    }
                }
                total += price * item.quantity;
            }
        });

        data.new_items.forEach((item) => {
            total += getDynamicItemPrice(item._base_price, item._takeaway_price) * item.quantity;
        });

        data.new_custom_items.forEach((item) => {
            total += item.price * item.quantity;
        });

        return Math.max(0, total - Number(data.discount || 0));
    }, [data, categories, order.order_type]);

    // --- Submit Handler ---
    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            ...data,
            table_id: data.order_type === 'dine_in' ? data.table_id : null,
            existing_items: data.existing_items.map(({ id, quantity, notes, name, price }) => ({
                id, quantity, notes, name, price
            })),
            new_items: data.new_items.map(({ id, quantity, notes }) => ({ id, quantity, notes })),
            new_custom_items: data.new_custom_items.map(({ name, price, quantity, notes }) => ({
                name, price, quantity, notes
            })),
        };

        put(route('orders.update', order.id), {
            data: payload as any,
            preserveScroll: true,
        });
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Orders', href: '/orders' },
        { title: order.order_number, href: route('orders.show', order.id) },
        { title: 'Admin Edit', href: '#' },
    ];

    const currentCategory = categories.find((c) => c.id === selectedCategory);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit Order – ${order.order_number}`} />

            <div className="mx-auto max-w-7xl p-4 sm:p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold font-mono tracking-tight">{order.order_number}</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Admin Edit Mode
                            {isTakeaway && <span className="ml-2 text-xs font-medium text-primary">(Takeaway pricing active)</span>}
                        </p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href={route('orders.show', order.id)}>Discard Changes</Link>
                    </Button>
                </div>

                <form onSubmit={submit} className="grid gap-6 lg:grid-cols-12 lg:items-start">

                    {/* LEFT COLUMN: Add Items & Order Details */}
                    <div className="lg:col-span-7 xl:col-span-8 space-y-6">

                        {/* Order Metadata Details */}
                        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-5">
                            <h2 className="font-semibold text-lg border-b pb-2">Order Information</h2>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Order Type</label>
                                    <select
                                        value={data.order_type}
                                        onChange={(e) => setData('order_type', e.target.value)}
                                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary"
                                    >
                                        <option value="dine_in">Dine In</option>
                                        <option value="takeaway">Takeaway</option>
                                        <option value="delivery">Delivery</option>
                                        <option value="uber">Uber Eats</option>
                                        <option value="pickme">PickMe</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Payment Status</label>
                                    <select
                                        value={data.payment_status}
                                        onChange={(e) => setData('payment_status', e.target.value)}
                                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="paid">Paid</option>
                                    </select>
                                </div>

                                {/* Show Payment Method only when Paid */}
                                {data.payment_status === 'paid' && (
                                    <div className="space-y-1.5 md:col-span-1 col-span-2">
                                        <label className="text-sm font-medium text-primary">Payment Method</label>
                                        <select
                                            value={data.payment_method}
                                            onChange={(e) => setData('payment_method', e.target.value)}
                                            className="w-full rounded-md border-primary/50 bg-primary/5 px-3 py-2 text-sm focus:ring-1 focus:ring-primary font-medium"
                                        >
                                            <option value="Cash">Cash</option>
                                            <option value="Visa">Visa</option>
                                            <option value="Master">Master</option>
                                            <option value="Uber">Uber</option>
                                            <option value="Pickme">Pickme</option>
                                            <option value="Bank_Transfer">Bank Transfer</option>
                                        </select>
                                    </div>
                                )}

                                {data.order_type === 'dine_in' && (
                                    <div className={`space-y-1.5 ${data.payment_status === 'paid' ? 'col-span-2 md:col-span-3' : 'md:col-span-1 col-span-2'}`}>
                                        <label className="text-sm font-medium">Table</label>
                                        <select
                                            value={data.table_id}
                                            onChange={(e) => setData('table_id', e.target.value)}
                                            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary"
                                        >
                                            <option value="">Select Table...</option>
                                            {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        {errors.table_id && <p className="text-xs text-destructive">{errors.table_id}</p>}
                                    </div>
                                )}

                                <div className="space-y-1.5 col-span-2 md:col-span-3">
                                    <label className="text-sm font-medium">Customer Profile</label>
                                    <select
                                        value={data.user_id}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setData('user_id', val);
                                            if (val) {
                                                const c = customers.find(x => x.id.toString() === val);
                                                if (c) {
                                                    setData('customer_name', c.name);
                                                    setData('customer_phone', c.phone || '');
                                                }
                                            } else {
                                                setData('customer_name', '');
                                                setData('customer_phone', '');
                                            }
                                        }}
                                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary"
                                    >
                                        <option value="">Guest (Manual Entry)</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
                                    </select>
                                </div>
                            </div>

                            {!data.user_id && (
                                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium">Guest Name</label>
                                        <input
                                            type="text"
                                            value={data.customer_name}
                                            onChange={e => setData('customer_name', e.target.value)}
                                            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium">Guest Phone</label>
                                        <input
                                            type="text"
                                            value={data.customer_phone}
                                            onChange={e => setData('customer_phone', e.target.value)}
                                            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Menu Picker */}
                        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                            <div className="flex gap-2 overflow-x-auto border-b bg-muted/30 p-3 scrollbar-hide">
                                {categories.map((cat) => (
                                    <button
                                        type="button"
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                            selectedCategory === cat.id
                                                ? 'bg-primary text-primary-foreground shadow'
                                                : 'bg-background border hover:bg-muted text-muted-foreground'
                                        }`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 xl:grid-cols-4">
                                {currentCategory?.items.map((item) => {
                                    const prepared = preparedStock[item.id];
                                    return (
                                        <button
                                            type="button"
                                            key={item.id}
                                            onClick={() => addToCart(item)}
                                            className="group flex h-full flex-col items-start justify-between rounded-lg border bg-background p-3 text-left transition-all hover:border-primary/50 hover:shadow-sm"
                                        >
                                            <div className="w-full space-y-1">
                                                <span className="text-sm font-medium leading-tight line-clamp-2">{item.name}</span>
                                                <span className="block text-xs font-semibold text-muted-foreground">
                                                    Rs. {getDynamicItemPrice(item.price, item.takeaway_price).toFixed(2)}
                                                </span>
                                            </div>
                                            {prepared && (
                                                <Badge variant="secondary" className="mt-2 text-[10px] w-full justify-center">
                                                    {prepared.quantity} Prepared
                                                </Badge>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Custom Item Adder */}
                        <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
                            <h3 className="text-sm font-semibold">Inject One-Time / Custom Item</h3>
                            <div className="grid gap-3 sm:grid-cols-12 items-end">
                                <div className="sm:col-span-5 space-y-1">
                                    <label className="text-xs font-medium">Item Name</label>
                                    <input
                                        type="text"
                                        value={customItemName}
                                        onChange={(e) => setCustomItemName(e.target.value)}
                                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary"
                                    />
                                </div>
                                <div className="sm:col-span-3 space-y-1">
                                    <label className="text-xs font-medium">Price (Rs)</label>
                                    <input
                                        type="number" min="0" step="0.01"
                                        value={customItemPrice}
                                        onChange={(e) => setCustomItemPrice(e.target.value)}
                                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary"
                                    />
                                </div>
                                <div className="sm:col-span-2 space-y-1">
                                    <label className="text-xs font-medium">Qty</label>
                                    <input
                                        type="number" min="1"
                                        value={customItemQuantity}
                                        onChange={(e) => setCustomItemQuantity(e.target.value)}
                                        className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <Button type="button" variant="secondary" className="w-full" onClick={addCustomItem}>
                                        Add
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: The Manifest / Cart */}
                    <div className="lg:col-span-5 xl:col-span-4 rounded-xl border bg-card p-0 shadow-sm overflow-hidden flex flex-col lg:sticky lg:top-6 max-h-[85vh]">
                        <div className="p-4 border-b bg-muted/20 flex justify-between items-center">
                            <h2 className="font-semibold text-lg">Order Manifest</h2>
                            <Badge variant="outline">{data.existing_items.length + data.new_items.length + data.new_custom_items.length} Lines</Badge>
                        </div>

                        <div className="p-4 overflow-y-auto space-y-5 flex-1">

                            {/* Existing Items */}
                            {data.existing_items.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Items</h4>
                                    {data.existing_items.map((item) => (
                                        <div key={item.id} className={`flex items-center justify-between p-2 -mx-2 rounded hover:bg-muted/30 transition-colors ${item.quantity === 0 ? 'opacity-40 grayscale' : ''}`}>
                                            <div className="flex-1">
                                                <p className={`text-sm font-medium ${item.quantity === 0 ? 'line-through' : ''}`}>
                                                    {item._name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {item.quantity === 0 ? 'Marked for deletion' : `Rs. ${((item._is_custom ? (item.price || 0) : item._original_price) * item.quantity).toFixed(2)}`}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    type="button" variant="outline" size="icon" className="h-7 w-7"
                                                    onClick={() => updateExistingQuantity(item.id, item.quantity - 1)}
                                                    disabled={item.quantity === 0}
                                                >
                                                    −
                                                </Button>
                                                <span className="w-4 text-center text-sm font-mono">{item.quantity}</span>
                                                <Button
                                                    type="button" variant="outline" size="icon" className="h-7 w-7"
                                                    onClick={() => updateExistingQuantity(item.id, item.quantity + 1)}
                                                >
                                                    +
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Added Catalog Items */}
                            {data.new_items.length > 0 && (
                                <div className="space-y-3 pt-2 border-t border-dashed">
                                    <h4 className="text-xs font-bold text-primary uppercase tracking-wider">New Items</h4>
                                    {data.new_items.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between p-2 -mx-2 bg-primary/5 rounded">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-primary">{item._name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Rs. {(getDynamicItemPrice(item._base_price, item._takeaway_price) * item.quantity).toFixed(2)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    type="button" variant="outline" size="icon" className="h-7 w-7 bg-background"
                                                    onClick={() => updateNewItemQuantity(item.id, item.quantity - 1)}
                                                >
                                                    −
                                                </Button>
                                                <span className="w-4 text-center text-sm font-mono">{item.quantity}</span>
                                                <Button
                                                    type="button" variant="outline" size="icon" className="h-7 w-7 bg-background"
                                                    onClick={() => updateNewItemQuantity(item.id, item.quantity + 1)}
                                                >
                                                    +
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Added Custom Items */}
                            {data.new_custom_items.length > 0 && (
                                <div className="space-y-3 pt-2 border-t border-dashed">
                                    <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider">New Custom Lines</h4>
                                    {data.new_custom_items.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between p-2 -mx-2 bg-emerald-50 dark:bg-emerald-950/20 rounded">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{item.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Rs. {(item.price * item.quantity).toFixed(2)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    type="button" variant="outline" size="icon" className="h-7 w-7 bg-background"
                                                    onClick={() => updateCustomQuantity(item.id, item.quantity - 1)}
                                                >
                                                    −
                                                </Button>
                                                <span className="w-4 text-center text-sm font-mono">{item.quantity}</span>
                                                <Button
                                                    type="button" variant="outline" size="icon" className="h-7 w-7 bg-background"
                                                    onClick={() => updateCustomQuantity(item.id, item.quantity + 1)}
                                                >
                                                    +
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer Totals & Submission */}
                        <div className="p-4 border-t bg-muted/10 space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-muted-foreground">Discount Applied (Rs)</label>
                                <input
                                    type="number" min="0" step="0.01"
                                    value={data.discount}
                                    onChange={(e) => setData('discount', Number(e.target.value) || 0)}
                                    className="w-24 rounded-md border bg-background px-2 py-1 text-sm text-right focus:ring-1 focus:ring-primary"
                                />
                            </div>

                            <div className="flex items-center justify-between text-xl font-bold border-t pt-3">
                                <span>Total Price</span>
                                <span>Rs. {currentTotal.toFixed(2)}</span>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-semibold tracking-wide"
                                disabled={processing}
                            >
                                {processing ? 'Committing Changes...' : 'Save Updates'}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
