import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';

interface Item {
    id: number;
    name: string;
    price: number;
    takeaway_price: number | null;
    image_url: string | null;
    is_active: boolean;
}

interface Category {
    id: number;
    name: string;
    items: Item[];
}

interface SearchItem extends Item {
    categoryId: number;
    categoryName: string;
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

interface CartEntry {
    item: Item;
    quantity: number;
    notes: string | null;
}

interface CustomCartEntry {
    id: string;
    name: string;
    price: number;
    quantity: number;
    notes: string | null;
}


interface Props {
    categories: Category[];
    tables: TableRow[];
    customers: Customer[];
}

type NoteTarget =
    | { type: 'cart'; id: number }
    | { type: 'custom'; id: string };

interface Props {
    categories: Category[];
    tables: TableRow[];
    customers: Customer[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Orders', href: '/orders' },
    { title: 'Create Order', href: '#' },
];

const ORDER_TYPES = [
    { value: 'dine_in', label: 'Dine In' },
    { value: 'takeaway', label: 'Takeaway' },
    { value: 'delivery', label: 'Delivery' },
    { value: 'uber', label: 'Uber Eats' },
    { value: 'pickme', label: 'PickMe' },
] as const;

const PAYMENT_METHODS = ['cash', 'card', 'online'] as const;

type Step = 1 | 2 | 3;

export default function CreateOrder({ categories, tables, customers }: Props) {
    const [step, setStep] = useState<Step>(1);

    // Step 1
    const [orderType, setOrderType] = useState<string>('dine_in');
    const [tableId, setTableId] = useState<number | null>(null);

    // Step 2
    const [selectedCatId, setSelectedCatId] = useState<number | null>(
        categories.length > 0 ? categories[0].id : null,
    );
    const [itemSearch, setItemSearch] = useState('');
    const [cart, setCart] = useState<CartEntry[]>([]);
    const [customItems, setCustomItems] = useState<CustomCartEntry[]>([]);
    const [customItemName, setCustomItemName] = useState('');
    const [customItemPrice, setCustomItemPrice] = useState('');
    const [customItemQuantity, setCustomItemQuantity] = useState('1');
    const [notesDialogOpen, setNotesDialogOpen] = useState(false);
    const [notesDraft, setNotesDraft] = useState('');
    const [notesTarget, setNotesTarget] = useState<NoteTarget | null>(null);

    // Step 3
    const [userId, setUserId] = useState<number | null>(null);
    const [customerName, setCustomerName] = useState('');
    const [phoneSearch, setPhoneSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [discount, setDiscount] = useState<string>('0');
    const [submitting, setSubmitting] = useState(false);

    const phoneSuggestions = phoneSearch.length >= 2
        ? customers.filter((c) => c.phone && c.phone.includes(phoneSearch))
        : [];

    const selectedCat = categories.find((c) => c.id === selectedCatId) ?? null;
    const getItemPrice = (item: Item) => {
       const usesTakeawayBase =
           ['takeaway', 'uber', 'pickme'].includes(orderType) && item.takeaway_price !== null;
       const base = usesTakeawayBase ? Number(item.takeaway_price) : Number(item.price);
       return ['uber', 'pickme'].includes(orderType) ? base * 0.7 : base;
    };
    const allItems: SearchItem[] = categories.flatMap((category) =>
        category.items.map((item) => ({
            ...item,
            categoryId: category.id,
            categoryName: category.name,
        })),
    );

    const searchQuery = itemSearch.trim().toLowerCase();
    const searchResults = searchQuery
        ? allItems.filter((item) =>
              item.name.toLowerCase().includes(searchQuery) ||
              item.categoryName.toLowerCase().includes(searchQuery),
          )
        : [];

    const visibleItems = searchQuery
        ? searchResults
        : selectedCat
            ? selectedCat.items.map((item) => ({
                  ...item,
                  categoryId: selectedCat.id,
                  categoryName: selectedCat.name,
              }))
            : [];

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

            return [...prev, { id: `custom-${Date.now()}`, name, price, quantity, notes: null }];
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

        setCustomItems((prev) =>
            prev.map((entry) => (entry.id === id ? { ...entry, quantity } : entry)),
        );
    };

    const removeCustomItem = (id: string) => {
        setCustomItems((prev) => prev.filter((entry) => entry.id !== id));
    };

    const openNotesDialog = (target: NoteTarget, currentNotes: string | null) => {
        setNotesTarget(target);
        setNotesDraft(currentNotes ?? '');
        setNotesDialogOpen(true);
    };

    const saveNotes = () => {
        if (!notesTarget) return;

        const nextNotes = notesDraft.trim();

        if (notesTarget.type === 'cart') {
            setCart((prev) =>
                prev.map((entry) =>
                    entry.item.id === notesTarget.id
                        ? { ...entry, notes: nextNotes.length > 0 ? nextNotes : null }
                        : entry,
                ),
            );
        } else {
            setCustomItems((prev) =>
                prev.map((entry) =>
                    entry.id === notesTarget.id
                        ? { ...entry, notes: nextNotes.length > 0 ? nextNotes : null }
                        : entry,
                ),
            );
        }

        setNotesDialogOpen(false);
        setNotesTarget(null);
        setNotesDraft('');
    };

    const addToCart = (item: Item) => {
        setCart((prev) => {
            const existing = prev.find((e) => e.item.id === item.id);
            if (existing) {
                return prev.map((e) =>
                    e.item.id === item.id ? { ...e, quantity: e.quantity + 1 } : e,
                );
            }
            return [...prev, { item, quantity: 1, notes: null }];
        });
    };

    const setQty = (itemId: number, qty: number) => {
        if (qty <= 0) {
            setCart((prev) => prev.filter((e) => e.item.id !== itemId));
        } else {
            setCart((prev) =>
                prev.map((e) => (e.item.id === itemId ? { ...e, quantity: qty } : e)),
            );
        }
    };

    const subtotal = cart.reduce((sum, e) => sum + getItemPrice(e.item) * e.quantity, 0);
    const customSubtotal = customItems.reduce((sum, e) => sum + e.price * e.quantity, 0);
    const discountNum = Math.max(0, parseFloat(discount) || 0);
    const total = Math.max(0, subtotal + customSubtotal - discountNum);

    const canStep1 = orderType !== '' && (orderType !== 'dine_in' || tableId !== null);
    const canStep2 = cart.length > 0 || customItems.length > 0;

    const handleSubmit = () => {
        if (submitting) return;
        setSubmitting(true);

        router.post(
            route('orders.store'),
            {
                order_type: orderType,
                table_id: tableId,
                user_id: userId,
                customer_name: customerName || undefined,
                customer_phone: userId === null ? (phoneSearch || undefined) : undefined,
                payment_method: paymentMethod,
                discount: discountNum,
                items: cart.map((e) => ({ id: e.item.id, quantity: e.quantity, notes: e.notes })),
                custom_items: customItems.map((e) => ({
                    name: e.name,
                    price: e.price,
                    quantity: e.quantity,
                    notes: e.notes,
                })),
            },
            {
                onError: () => setSubmitting(false),
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Order" />

            <div className="w-full space-y-6 p-4">
                {/* Step indicator */}
                <div className="flex items-center gap-2">
                    {([1, 2, 3] as Step[]).map((s) => (
                        <div key={s} className="flex items-center gap-2">
                            <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                                    step === s
                                        ? 'bg-primary text-primary-foreground'
                                        : step > s
                                          ? 'bg-primary/20 text-primary'
                                          : 'bg-muted text-muted-foreground'
                                }`}
                            >
                                {s}
                            </div>
                            <span
                                className={`text-sm ${step === s ? 'font-medium' : 'text-muted-foreground'}`}
                            >
                                {s === 1 ? 'Order Setup' : s === 2 ? 'Select Items' : 'Confirm'}
                            </span>
                            {s < 3 && <div className="h-px w-8 bg-border" />}
                        </div>
                    ))}
                </div>

                {/* Step 1: Order type + table */}
                {step === 1 && (
                    <div className="rounded-lg border bg-card p-6 space-y-6">
                        <h2 className="text-lg font-medium">Order Setup</h2>

                        <div>
                            <p className="text-sm font-medium mb-3">Order Type</p>
                            <div className="flex gap-3 flex-wrap">
                                {ORDER_TYPES.map((t) => (
                                    <button
                                        key={t.value}
                                        onClick={() => {
                                            setOrderType(t.value);
                                            if (t.value !== 'dine_in') setTableId(null);
                                        }}
                                        className={`rounded-lg border px-6 py-3 text-sm font-medium transition-colors ${
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
                                <p className="text-sm font-medium mb-3">Select Table</p>
                                {tables.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No tables available.</p>
                                ) : (
                                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                                        {tables.map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={() => setTableId(t.id)}
                                                className={`rounded-lg border p-3 text-sm font-medium transition-colors ${
                                                    tableId === t.id
                                                        ? 'border-primary bg-primary/10 text-primary'
                                                        : t.is_available
                                                          ? 'hover:bg-muted'
                                                          : 'opacity-50 cursor-not-allowed'
                                                }`}
                                                disabled={!t.is_available && tableId !== t.id}
                                            >
                                                {t.name}
                                                {!t.is_available && (
                                                    <div className="text-xs text-muted-foreground mt-1">
                                                        Occupied
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end">
                            <Button onClick={() => setStep(2)} disabled={!canStep1}>
                                Next: Select Items
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 2: Item selection */}
                {step === 2 && (
                    <div className="grid gap-4 lg:grid-cols-12">
                        {/* Categories sidebar */}
                        <aside className="rounded-lg border bg-card p-4 lg:col-span-3">
                            <h2 className="text-lg font-medium">Categories</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Choose a category to view its items.
                            </p>

                            <div className="mt-4 space-y-2 max-h-[520px] overflow-y-auto pr-1">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCatId(cat.id)}
                                        className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                                            selectedCatId === cat.id
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'bg-background hover:border-primary/60 hover:bg-muted/50'
                                        }`}
                                    >
                                        <span>{cat.name}</span>
                                        <Badge variant="secondary" className="ml-3">
                                            {cat.items.length}
                                        </Badge>
                                    </button>
                                ))}
                            </div>
                        </aside>

                        {/* Middle items */}
                        <div className="rounded-lg border bg-card p-4 space-y-4 lg:col-span-6">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-medium">Items</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedCat ? selectedCat.name : 'No category selected'}
                                    </p>
                                </div>
                                <Badge variant="outline">
                                    {visibleItems.length} items
                                </Badge>
                            </div>

                            <div>
                                <input
                                    type="search"
                                    value={itemSearch}
                                    onChange={(e) => setItemSearch(e.target.value)}
                                    placeholder="Search items..."
                                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                />
                            </div>

                                {searchQuery ? (
                                    visibleItems.length === 0 ? (
                                        <p className="text-sm text-muted-foreground py-4">
                                            No matching items found.
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                                            {visibleItems.map((item) => {
                                                const inCart = cart.find((e) => e.item.id === item.id);
                                                return (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => addToCart(item)}
                                                        className="rounded-lg border bg-background p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
                                                    >
                                                        {item.image_url && (
                                                            <img
                                                                src={item.image_url}
                                                                alt={item.name}
                                                                className="mb-2 h-20 w-full rounded object-cover"
                                                            />
                                                        )}
                                                        <p className="text-sm font-medium leading-tight">
                                                            {item.name}
                                                        </p>
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            {item.categoryName}
                                                        </p>
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            Rs. {getItemPrice(item).toFixed(2)}
                                                        </p>

                                                        {inCart && (
                                                            <Badge className="mt-2 text-xs" variant="secondary">
                                                                {inCart.quantity} selected
                                                            </Badge>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )
                                ) : selectedCat ? (
                                        visibleItems.length === 0 ? (
                                            <p className="text-sm text-muted-foreground py-4">
                                                No items in this category.
                                            </p>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                                                {visibleItems.map((item) => {
                                                    const inCart = cart.find((e) => e.item.id === item.id);
                                                    return (
                                                        <button
                                                            key={item.id}
                                                            onClick={() => addToCart(item)}
                                                            className="rounded-lg border bg-background p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
                                                        >
                                                            {item.image_url && (
                                                                <img
                                                                    src={item.image_url}
                                                                    alt={item.name}
                                                                    className="mb-2 h-20 w-full rounded object-cover"
                                                                />
                                                            )}
                                                            <p className="text-sm font-medium leading-tight">
                                                                {item.name}
                                                            </p>
                                                            <p className="mt-1 text-xs text-muted-foreground">
                                                                {selectedCat.name}
                                                            </p>
                                                            <p className="mt-1 text-xs text-muted-foreground">
                                                                Rs. {getItemPrice(item).toFixed(2)}
                                                            </p>
                                                            
                                                            {inCart && (
                                                                <Badge className="mt-2 text-xs" variant="secondary">
                                                                    {inCart.quantity} selected
                                                                </Badge>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )
                                    ) : (
                                        <p className="text-sm text-muted-foreground py-4">
                                            Select a category from the left sidebar.
                                        </p>
                                    )}
                        </div>

                        {/* Selected items */}
                        <aside className="rounded-lg border bg-card p-4 space-y-4 flex flex-col lg:col-span-3">
                            <div>
                                <h2 className="text-lg font-medium">Selected Items</h2>
                                <p className="text-sm text-muted-foreground">
                                    Items added to this order.
                                </p>
                            </div>

                            <div className="rounded-md border bg-background p-3 space-y-3">
                                <div>
                                    <p className="text-sm font-medium">One-time Item</p>
                                    <p className="text-xs text-muted-foreground">
                                        Add a custom line item that is not in the item catalog.
                                    </p>
                                </div>
                                <div className="grid gap-2">
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
                                    <Button type="button" variant="outline" onClick={addCustomItem}>
                                        Add One-time Item
                                    </Button>
                                </div>
                            </div>

                            {cart.length === 0 ? (
                                <>
                                    {customItems.length === 0 ? (
                                        <p className="text-sm text-muted-foreground flex-1">
                                            No items added yet. Click items from the middle panel.
                                        </p>
                                    ) : null}
                                </>
                            ) : (
                                <div className="flex-1 space-y-2 overflow-y-auto max-h-[400px]">
                                    {cart.map((entry) => (
                                        <div
                                            key={entry.item.id}
                                            className="rounded-md border bg-background p-3 text-sm space-y-2"
                                        >
                                            <div>
                                                <p className="text-xs text-muted-foreground">Item Name</p>
                                                <p className="break-words font-medium leading-snug">{entry.item.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Quantity and Adjustment</p>
                                                <div className="mt-1 flex items-center gap-1">
                                                    <button
                                                        onClick={() => setQty(entry.item.id, entry.quantity - 1)}
                                                        className="h-6 w-6 rounded border text-center text-sm hover:bg-muted"
                                                    >
                                                        −
                                                    </button>
                                                    <span className="w-6 text-center">{entry.quantity}</span>
                                                    <button
                                                        onClick={() => setQty(entry.item.id, entry.quantity + 1)}
                                                        className="h-6 w-6 rounded border text-center text-sm hover:bg-muted"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Price</p>
                                                <p className="font-medium">Rs. {(getItemPrice(entry.item) * entry.quantity).toFixed(2)}</p>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openNotesDialog({ type: 'cart', id: entry.item.id }, entry.notes)}
                                                >
                                                    {entry.notes ? 'Edit Notes' : 'Add Notes'}
                                                </Button>

                                                {entry.notes && (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Notes: {entry.notes}
                                                    </p>
                                                )}

                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {customItems.length > 0 && (
                                <div className="space-y-2 border-t pt-3">
                                    <p className="text-sm font-medium">One-time Items</p>
                                    <div className="space-y-2">
                                        {customItems.map((entry) => (
                                            <div
                                                key={entry.id}
                                                className="rounded-md border bg-background p-3 text-sm space-y-2"
                                            >
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Item Name</p>
                                                    <p className="break-words font-medium leading-snug">{entry.name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Quantity and Adjustment</p>
                                                    <div className="mt-1 flex items-center gap-1">
                                                        <button
                                                            onClick={() => updateCustomQuantity(entry.id, entry.quantity - 1)}
                                                            className="h-6 w-6 rounded border text-center text-sm hover:bg-muted"
                                                        >
                                                            −
                                                        </button>
                                                        <span className="w-6 text-center">{entry.quantity}</span>
                                                        <button
                                                            onClick={() => updateCustomQuantity(entry.id, entry.quantity + 1)}
                                                            className="h-6 w-6 rounded border text-center text-sm hover:bg-muted"
                                                        >
                                                            +
                                                        </button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeCustomItem(entry.id)}
                                                        >
                                                            ×
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Price</p>
                                                    <p className="font-medium">Rs. {entry.price.toFixed(2)}</p>

                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openNotesDialog({ type: 'custom', id: entry.id }, entry.notes)}
                                                    >
                                                        {entry.notes ? 'Edit Notes' : 'Add Notes'}
                                                    </Button>

                                                    {entry.notes && (
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            Notes: {entry.notes}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="border-t pt-3 text-sm font-medium flex justify-between">
                                <span>Subtotal</span>
                                <span>Rs. {(subtotal + customSubtotal).toFixed(2)}</span>
                            </div>

                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                                    Back
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={() => setStep(3)}
                                    disabled={!canStep2}
                                >
                                    Next: Confirm
                                </Button>
                            </div>
                        </aside>
                    </div>
                )}

                {step === 3 && (
                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-lg border bg-card p-6 space-y-4">
                            <h2 className="text-lg font-medium">Customer Details</h2>

                            <div className="relative">
                                <label className="mb-1 block text-sm font-medium">
                                    Search by Phone Number (optional)
                                </label>
                                <input
                                    type="tel"
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
                                    placeholder="e.g. 0771234567"
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
                                {userId !== null && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Matched: {customerName}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">Customer Name</label>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Enter customer name"
                                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">Payment Method</label>
                                <div className="flex flex-wrap gap-2">
                                    {PAYMENT_METHODS.map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => setPaymentMethod(m)}
                                            className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-colors ${
                                                paymentMethod === m
                                                    ? 'border-primary bg-primary/10 text-primary'
                                                    : 'hover:bg-muted'
                                            }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">Discount (Rs.)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={discount}
                                    onChange={(e) => setDiscount(e.target.value)}
                                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col rounded-lg border bg-card p-6 space-y-4">
                            <h2 className="text-lg font-medium">Order Summary</h2>

                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Type</span>
                                    <span className="capitalize">{orderType.replace('_', ' ')}</span>
                                </div>
                                {tableId !== null && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Table</span>
                                        <span>{tables.find((t) => t.id === tableId)?.name}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Customer</span>
                                    <span>{customerName || '—'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Payment</span>
                                    <span className="capitalize">{paymentMethod}</span>
                                </div>
                            </div>

                            <div className="border-t pt-3 space-y-2 text-sm flex-1">
                                <p className="mb-2 font-medium text-muted-foreground">Items</p>
                                {cart.map((e) => (
                                    <div key={e.item.id} className="flex justify-between">
                                        <span>
                                            {e.item.name}{' '}
                                            <span className="text-muted-foreground">× {e.quantity}</span>
                                        </span>
                                        <span>Rs. {(getItemPrice(e.item) * e.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                                {customItems.map((e) => (
                                    <div key={e.id} className="flex justify-between">
                                        <span>
                                            {e.name} <span className="text-muted-foreground">× {e.quantity}</span>
                                        </span>
                                        <span>Rs. {(e.price * e.quantity).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t pt-3 space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>Rs. {(subtotal + customSubtotal).toFixed(2)}</span>
                                </div>
                                {discountNum > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Discount</span>
                                        <span>− Rs. {discountNum.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold">
                                    <span>Total</span>
                                    <span>Rs. {total.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                                    Back
                                </Button>
                                <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
                                    {submitting ? 'Placing Order…' : 'Place Order'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Notes</DialogTitle>
                            <DialogDescription>
                                Add an optional note for this item. Leave it blank to clear the note.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Note</label>
                            <textarea
                                value={notesDraft}
                                onChange={(e) => setNotesDraft(e.target.value)}
                                placeholder="Write item instructions or special requests"
                                className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm"
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setNotesDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="button" onClick={saveNotes}>
                                Save Notes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
