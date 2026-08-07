import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';

interface Item {
    id: number;
    name: string;
    price: number;
    takeaway_price: number | null;
    image_url: string | null;
    is_active: boolean;
    quantity: number;
}

interface CategoryWithItems {
    id: number;
    name: string;
    items: Item[];
}

interface ItemsIndexProps {
    categories: CategoryWithItems[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Items', href: '/items' },
];

function ItemsTable({ items }: { items: Item[] }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                    <tr>
                        <th className="px-4 py-3 font-medium">Image</th>
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium">Price</th>
                        <th className="px-4 py-3 font-medium">Takeaway Price</th>
                        <th className="px-4 py-3 font-medium">Quantity</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {items.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                No items in this category.
                            </td>
                        </tr>
                    ) : (
                        items.map((item) => (
                            <tr key={item.id} className="border-t">
                                <td className="px-4 py-3">
                                    {item.image_url ? (
                                        <img
                                            src={item.image_url}
                                            alt={item.name}
                                            className="h-14 w-14 rounded-md border object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-14 w-14 items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                                            No image
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3">{item.name}</td>
                                <td className="px-4 py-3">{item.price}</td>
                                <td className="px-4 py-3">{item.takeaway_price ?? '—'}</td>
                                <td className="px-4 py-3">{item.quantity}</td>
                                <td className="px-4 py-3">
                                    {item.is_active ? (
                                        <Badge variant="secondary">Active</Badge>
                                    ) : (
                                        <Badge variant="destructive">Unavailable</Badge>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={route('items.edit', item.id)}>Edit</Link>
                                    </Button>
                                    {item.is_active && (
                                        <Button variant="destructive" size="sm" className="ml-2" asChild>
                                            <Link href={route('items.unavailable', item.id)} method="post" as="button">
                                                Make Unavailable
                                            </Link>
                                        </Button>
                                    )}
                                    {!item.is_active && (
                                        <Button variant="secondary" size="sm" className="ml-2" asChild>
                                            <Link href={route('items.available', item.id)} method="post" as="button">
                                                Make Available
                                            </Link>
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default function ItemsIndex({ categories }: ItemsIndexProps) {
    const [selectedId, setSelectedId] = useState<number | null>(
        categories.length > 0 ? categories[0].id : null
    );
    const [search, setSearch] = useState('');

    const selected = categories.find((c) => c.id === selectedId) ?? null;
    const isSearching = search.trim().length > 0;

    // When searching, show matching items grouped by category across the whole menu
    const searchResults = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return [];
        return categories
            .map((cat) => ({
                ...cat,
                items: cat.items.filter((item) => item.name.toLowerCase().includes(q)),
            }))
            .filter((cat) => cat.items.length > 0);
    }, [categories, search]);

    const totalMatches = searchResults.reduce((sum, cat) => sum + cat.items.length, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Items" />

            <div className="space-y-6 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-2xl font-semibold">Items</h1>
                    <Button asChild>
                        <Link href={route('items.create')}>Create Item</Link>
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search items by name..."
                        className="w-full max-w-sm rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 sm:w-72"
                    />
                    {isSearching && (
                        <span className="text-xs text-muted-foreground">
                            {totalMatches} match{totalMatches === 1 ? '' : 'es'}
                        </span>
                    )}
                </div>

                {categories.length === 0 ? (
                    <div className="rounded-lg border bg-card p-6 text-center">No categories found.</div>
                ) : isSearching ? (
                    // Search mode: show every matching item, grouped by category
                    <div className="space-y-4">
                        {searchResults.length === 0 ? (
                            <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
                                No items match "{search}".
                            </div>
                        ) : (
                            searchResults.map((cat) => (
                                <section key={cat.id} className="rounded-lg border bg-card p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                        <h2 className="text-lg font-medium">{cat.name}</h2>
                                        <Badge>{cat.items.length} match{cat.items.length === 1 ? '' : 'es'}</Badge>
                                    </div>
                                    <ItemsTable items={cat.items} />
                                </section>
                            ))
                        )}
                    </div>
                ) : (
                    // Normal mode: sidebar + single category view
                    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
                        <aside className="rounded-lg border bg-card p-3 lg:max-h-[calc(100vh-220px)] lg:overflow-y-auto">
                            <h2 className="mb-2 px-2 text-sm font-medium text-muted-foreground">Categories</h2>
                            <div className="space-y-2">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedId(cat.id)}
                                        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                                            selectedId === cat.id
                                                ? 'bg-primary text-primary-foreground shadow'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        }`}
                                    >
                                        <span>{cat.name}</span>
                                        <span className="rounded-full bg-background/20 px-1.5 py-0.5 text-xs">
                                            {cat.items.length}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </aside>

                        {selected && (
                            <section className="rounded-lg border bg-card p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <h2 className="text-lg font-medium">{selected.name}</h2>
                                    <Badge>{selected.items.length} items</Badge>
                                </div>
                                <ItemsTable items={selected.items} />
                            </section>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
