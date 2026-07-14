import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';

type CategoryRecord = {
    id: number;
    name: string;
    description?: string;
    image?: string;
    image_url?: string | null;
    is_active: boolean;
    created_at: string;
};

interface CategoriesIndexProps {
    categories: CategoryRecord[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Categories',
        href: '/categories',
    },
];

export default function CategoriesIndex({ categories }: CategoriesIndexProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Categories" />

            <div className="space-y-6 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">Categories</h1>
                        <p className="text-sm text-muted-foreground">Manage product categories.</p>
                    </div>
                    <Button asChild>
                        <Link href={route('categories.create')}>Create Category</Link>
                    </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border bg-card shadow-xs">
                    <table className="w-full min-w-[640px] text-sm lg:min-w-[720px]">
                        <thead className="bg-muted/40 text-left">
                            <tr>
                                                <th className="px-4 py-3 font-medium">Image</th>
                                <th className="px-4 py-3 font-medium">Name</th>
                                <th className="px-4 py-3 font-medium">Description</th>
                                <th className="px-4 py-3 font-medium">Active</th>
                                <th className="px-4 py-3 font-medium">Created</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                                        No categories found.
                                    </td>
                                </tr>
                            ) : (
                                categories.map((cat) => (
                                    <tr key={cat.id} className="border-t">
                                        <td className="px-4 py-3 font-medium">
                                            {cat.image_url ? (
                                                <img
                                                    src={cat.image_url}
                                                    alt={cat.name}
                                                    className="h-16 w-16 rounded-md object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <div className="bg-muted h-16 w-16 flex items-center justify-center rounded-md">
                                                    <span className="text-xs text-muted-foreground">No Image</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-medium">{cat.name}</td>
                                        <td className="px-4 py-3">{cat.description ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant={cat.is_active ? 'default' : 'destructive'} className="capitalize">
                                                {cat.is_active ? 'Active' : 'Disabled'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">{new Date(cat.created_at).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={route('categories.edit', cat.id)}>Edit</Link>
                                            </Button>
                                            <span className="ml-2">
                                                <Button variant={cat.is_active ? 'destructive' : 'default'} size="sm" asChild>
                                                    <Link
                                                        href={route(cat.is_active ? 'categories.disable' : 'categories.enable', cat.id)}
                                                        method="post"
                                                        as="button"
                                                    >
                                                        {cat.is_active ? 'Disable' : 'Enable'}
                                                    </Link>
                                                </Button>
                                            </span>
                                            <span className="ml-2">
                                                <Button variant="destructive" size="sm" asChild>
                                                    <Link
                                                        href={route('categories.destroy', cat.id)}
                                                        method="delete"
                                                        as="button"
                                                        onBefore={() => confirm('Are you sure you want to delete this category?')}
                                                    >
                                                        Delete
                                                    </Link>
                                                </Button>
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
