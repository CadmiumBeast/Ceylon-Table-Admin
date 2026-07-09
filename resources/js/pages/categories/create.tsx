import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import CounterPicker from '@/components/counter-picker';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Categories', href: '/categories' },
    { title: 'Create', href: '/categories/create' },
];

type CounterRecord = {
    id: number;
    name: string;
};

interface CreateCategoryForm {
    name: string;
    description: string;
    image: File | null;
    counter_ids: number[];
    [key: string]: string | number[] | File | null;
}

export default function CreateCategory({ counters }: { counters: CounterRecord[] }) {
    const { data, setData, post, processing, errors } = useForm<CreateCategoryForm>({
        name: '',
        description: '',
        image: null,
        counter_ids: [],
    });

    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setData('image', file);

        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            setImagePreview(null);
        }
    };


    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('categories.store'), {
            forceFormData: true,
        });
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

                    <div className="grid gap-3">
                        <div>
                            <Label>Counter Picker</Label>
                            <p className="text-sm text-muted-foreground">Pick one or more counters for this category.</p>
                        </div>

                        <CounterPicker counters={counters} value={data.counter_ids} onChange={(counterIds) => setData('counter_ids', counterIds)} />
                        <InputError message={errors.counter_ids} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="image">Image</Label>
                       <Input
                            id="image"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                        />
                        <InputError message={errors.image} />

                        {imagePreview && (
                            <div className="mt-2 flex justify-center">
                                <img src={imagePreview} alt="Preview" className="h-32 w-32 rounded-md object-cover" />
                            </div>
                        )}
                    </div>

                    <Button type="submit" className="mt-4 w-full" disabled={processing}>
                        Create
                    </Button>
                </form>
            </div>
        </AppLayout>
    );
}
