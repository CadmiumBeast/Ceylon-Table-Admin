import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';


interface Promotion {
    id: number;
    name: string;
    image: string | null;
    image_url: string | null;
    start_date: string;
    end_date: string;
    is_active: boolean;
}

interface Props {
    promotions: Promotion[];
}

export default function Index({ promotions }: Props) {
    const formatDate = (date: string) =>
        new Date(date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });

    const handleDelete = (id: number, name: string) => {
        if (confirm(`Delete promotion "${name}"? This cannot be undone.`)) {
            router.delete(route('promotions.destroy', id), {
                preserveScroll: true,
            });
        }
    };

    const handleToggleActive = (promotion: Promotion) => {
        router.patch(
            route('promotions.update', promotion.id),
            { is_active: !promotion.is_active },
            { preserveScroll: true }
        );
    };

    const statusOf = (promotion: Promotion) => {
        const today = new Date().toISOString().slice(0, 10);
        if (!promotion.is_active) return { label: 'Disabled', className: 'bg-gray-100 text-gray-600' };
        if (today < promotion.start_date) return { label: 'Scheduled', className: 'bg-amber-100 text-amber-700' };
        if (today > promotion.end_date) return { label: 'Expired', className: 'bg-red-100 text-red-700' };
        return { label: 'Live', className: 'bg-emerald-100 text-emerald-700' };
    };

    return (
        <AppLayout>
            <Head title="Promotions" />

            <div className="py-8">
                <div className="mx-auto max-w-6xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        {promotions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                                <p className="text-sm font-medium text-gray-900">No promotions yet</p>
                                <p className="mt-1 text-sm text-gray-500">
                                    Create a promotion to start featuring offers.
                                </p>
                                <Link
                                    href={route('promotions.create')}
                                    className="mt-4 inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                                >
                                    + New Promotion
                                </Link>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Promotion
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Duration
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {promotions.map((promotion) => {
                                        const status = statusOf(promotion);
                                        return (
                                            <tr key={promotion.id}>
                                                <td className="whitespace-nowrap px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {promotion.image_url ? (
                                                            <img
                                                                src={promotion.image_url}
                                                                alt={promotion.name}
                                                                className="h-10 w-10 rounded-md object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400">
                                                                No img
                                                            </div>
                                                        )}
                                                        <span className="text-sm font-medium text-gray-900">
                                                            {promotion.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                                    {formatDate(promotion.start_date)} – {formatDate(promotion.end_date)}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4">
                                                    <button
                                                        onClick={() => handleToggleActive(promotion)}
                                                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                                                        title="Click to toggle active state"
                                                    >
                                                        {status.label}
                                                    </button>
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                                                    <Link
                                                        href={route('promotions.edit', promotion.id)}
                                                        className="mr-4 font-medium text-gray-600 hover:text-gray-900"
                                                    >
                                                        Edit
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(promotion.id, promotion.name)}
                                                        className="font-medium text-red-600 hover:text-red-800"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
