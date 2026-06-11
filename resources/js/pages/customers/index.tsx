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
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Customers', href: '/customers' },
];

export default function CustomersIndex({ customers }: CustomersIndexProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Customers" />

            <div className="space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Customers</h1>
                    <Button asChild>
                        <Link href={route('customers.create')}>Add Customer</Link>
                    </Button>
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
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                        No customers found.
                                    </td>
                                </tr>
                            ) : (
                                customers.map((c) => (
                                    <tr key={c.id} className="border-t">
                                        <td className="px-4 py-3">
                                            {c.customer
                                                ? `${c.customer.first_name} ${c.customer.last_name}`
                                                : c.name}
                                        </td>
                                        <td className="px-4 py-3">{c.email}</td>
                                        <td className="px-4 py-3">{c.customer?.phone_number ?? '—'}</td>
                                        <td className="px-4 py-3 max-w-[200px] truncate">{c.customer?.address ?? '—'}</td>
                                        <td className="px-4 py-3">{new Date(c.created_at).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            <Button variant="outline" size="sm" asChild>
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
