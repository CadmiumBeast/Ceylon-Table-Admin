import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Categories', href: '/categories' },
    { title: 'Create', href: '/categories/create' },
];

interface CreateCategoryForm {
    name: string;
    description: string;
    [key: string]: string;
}

export default function CreateCategory() {
    const { data, setData, post, processing, errors } = useForm<CreateCategoryForm>({
        name: '',
        description: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('categories.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Category" />

            <div className="max-w-3xl space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Create Category</h1>
                    <Button variant="outline" asChild>
                        <Link href={route('categories.index')}>Back</Link>
                    </Button>
                </div>

                <form onSubmit={submit} className="space-y-5 rounded-lg border bg-card p-6 shadow-xs">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Input id="description" value={data.description} onChange={(e) => setData('description', e.target.value)} />
                        <InputError message={errors.description} />
                    </div>

                    <Button type="submit" className="mt-4 w-full" disabled={processing}>
                        Create
                    </Button>
                </form>
            </div>
        </AppLayout>
    );
}
