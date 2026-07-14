import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import CounterPicker from '@/components/counter-picker';

interface EditCategoryForm {
    name: string;
    description: string;
    food_type: 'lunch' | 'dinner' | 'both';
    image: File | null;
    counter_ids: number[];
    [key: string]: string | number[] | File | null;
}

type CategoryRecord = {
    id: number;
    name: string;
    description?: string;
    food_type: 'lunch' | 'dinner' | 'both';
    image?: string | null;
    image_url?: string | null;
    is_active: boolean;
    created_at: string;
    counters: CounterRecord[];
};

type CounterRecord = {
    id: number;
    name: string;
};

const breadcrumbs = (name: string): BreadcrumbItem[] => [
    { title: 'Categories', href: '/categories' },
    { title: `Edit: ${name}`, href: '/categories' },
];

export default function EditCategory({ category, counters }: { category: CategoryRecord; counters: CounterRecord[] }) {
    const { data, setData, put, processing, errors } = useForm<EditCategoryForm>({
        name: category.name ?? '',
        description: category.description ?? '',
        food_type: category.food_type ?? 'both',
        image: null,
        counter_ids: category.counters?.map((counter) => counter.id) ?? [],
    });

    const [imagePreview, setImagePreview] = useState<string | null>(category.image_url ?? null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setData('image', file);

        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            setImagePreview(category.image_url ?? null);
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(route('categories.update', category.id), {
            forceFormData: true,
        } as never);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs(category.name)}>
            <Head title={`Edit ${category.name}`} />

            <div className="max-w-3xl space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Edit Category</h1>
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

                    <div className="grid gap-2">
                        <Label htmlFor="food_type">Food Type</Label>
                        <Select value={data.food_type} onValueChange={(value) => setData('food_type', value as EditCategoryForm['food_type'])}>
                            <SelectTrigger id="food_type">
                                <SelectValue placeholder="Select food type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="lunch">Lunch</SelectItem>
                                <SelectItem value="dinner">Dinner</SelectItem>
                                <SelectItem value="both">Both</SelectItem>
                            </SelectContent>
                        </Select>
                        <InputError message={errors.food_type} />
                    </div>

                    <div className="grid gap-3">
                        <div>
                            <Label>Counter Picker</Label>
                            <p className="text-sm text-muted-foreground">Pick one or more counters for this category.</p>
                        </div>

                        <CounterPicker
                            counters={counters}
                            value={data.counter_ids}
                            onChange={(counterIds) => setData('counter_ids', counterIds)}
                            emptyState="No counters are available yet."
                        />
                        <InputError message={errors.counter_ids} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="image">Image</Label>
                        <Input id="image" type="file" accept="image/*" onChange={handleImageChange} />
                        <InputError message={errors.image} />

                        {imagePreview && (
                            <div className="mt-2 flex justify-center">
                                <img src={imagePreview} alt="Preview" className="h-32 w-32 rounded-md object-cover" />
                            </div>
                        )}
                    </div>

                    <Button type="submit" className="mt-4 w-full" disabled={processing}>
                        Save
                    </Button>
                </form>
            </div>
        </AppLayout>
    );
}
