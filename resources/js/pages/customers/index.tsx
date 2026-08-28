// resources/js/pages/customers/index.tsx
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
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

interface CustomersIndexProps {
    customers: Customer[];
    sort: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Customers', href: '/customers' },
];

const SORT_OPTIONS = [
    { value: 'name_asc', label: 'Name (A–Z)' },
    { value: 'name_desc', label: 'Name (Z–A)' },
    { value: 'joined_desc', label: 'Newest First' },
    { value: 'joined_asc', label: 'Oldest First' },
    { value: 'loyalty_desc', label: 'Loyalty Points (High–Low)' },
    { value: 'loyalty_asc', label: 'Loyalty Points (Low–High)' },
];

export default function CustomersIndex({ customers, sort }: CustomersIndexProps) {
    const handleSortChange = (value: string) => {
        router.get(
            route('customers.index'),
            { sort: value },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Customers" />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Customers</h1>
                    <div className="flex items-center gap-3">
                        <Select value={sort} onValueChange={handleSortChange}>
                            <SelectTrigger className="w-[220px]">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                {SORT_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button asChild>
                            <Link href={route('customers.create')}>Add Customer</Link>
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-lg border bg-card shadow-xs">
                    <table className="w-full min-w-[800px] text-sm">
                        <thead className="bg-muted/40 text-left">
                            <tr>
                                <th className="px-4 py-3 font-medium">Name</th>
                                <th className="px-4 py-3 font-medium">Email</th>
                                <th className="px-4 py-3 font-medium">Phone</th>
                                <th className="px-4 py-3 font-medium">Address</th>
                                <th className="px-4 py-3 font-medium">Joined</th>
                                <th className="px-4 py-3 font-medium">Loyalty Points</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                        No customers found.
                                    </td>
                                </tr>
                            ) : (
                                customers.map((c) => (
                                    <tr key={c.id} className="border-t">
                                        <td className="px-4 py-3">
                                            <Link
                                                href={route('customers.show', c.id)}
                                                className="font-medium hover:underline"
                                            >
                                                {c.customer
                                                    ? `${c.customer.first_name} ${c.customer.last_name}`
                                                    : c.name}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3">{c.email}</td>
                                        <td className="px-4 py-3">{c.customer?.phone_number ?? '—'}</td>
                                        <td className="px-4 py-3 max-w-[200px] truncate">{c.customer?.address ?? '—'}</td>
                                        <td className="px-4 py-3">{new Date(c.created_at).toLocaleDateString()}</td>
                                        <td className="px-4 py-3">{c.customer?.loyalty_points ?? 0}</td>
                                        <td className="px-4 py-3 text-right">
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={route('customers.show', c.id)}>View</Link>
                                            </Button>
                                            <Button variant="outline" size="sm" className="ml-2" asChild>
                                                <Link href={route('customers.edit', c.id)}>Edit</Link>
                                            </Button>
                                            <Button variant="destructive" size="sm" className="ml-2" asChild>
                                                <Link href={route('customers.destroy', c.id)} method="delete" as="button">
                                                    Delete
                                                </Link>
                                            </Button>
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
