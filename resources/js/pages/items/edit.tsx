import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { FormEventHandler, useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Items', href: '/items' },
    { title: 'Edit', href: '/items' },
];

interface EditProps {
    item: {
        id: number;
        name: string;
        description?: string;
        price: number;
        takeaway_price?: number | null;
        category_id: number;
        image_url?: string;
        quantity?: number;
    };
    categories: { id: number; name: string }[];
}

export default function EditItem({ item, categories }: EditProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState({
        name: item.name || '',
        description: item.description || '',
        price: String(item.price || ''),
        takeaway_price: item.takeaway_price === null || item.takeaway_price === undefined ? '' : String(item.takeaway_price),
        category_id: String(item.category_id || ''),
        quantity: String(item.quantity || ''),
    });
    const [imagePreview, setImagePreview] = useState<string | null>(item.image_url || null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});

        const form = new FormData();
        form.append('name', formData.name);
        form.append('description', formData.description);
        form.append('price', formData.price);
        form.append('takeaway_price', formData.takeaway_price);
        form.append('category_id', formData.category_id);
        form.append('quantity', formData.quantity);
        if (imageFile) {
            form.append('image', imageFile);
        }
        form.append('_method', 'PATCH');

        router.post(route('items.update', item.id), form as any, {
            onError: (errors) => {
                setErrors(errors as Record<string, string>);
                setProcessing(false);
            },
            onSuccess: () => {
                setProcessing(false);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit Item" />

            <div className="max-w-3xl space-y-6 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Edit Item</h1>
                    <Button variant="outline" asChild>
                        <Link href={route('items.index')}>Back</Link>
                    </Button>
                </div>

                <form onSubmit={submit} className="space-y-5 rounded-lg border bg-card p-6 shadow-xs">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Input id="description" name="description" value={formData.description} onChange={handleChange} />
                        <InputError message={errors.description} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="price">Price</Label>
                        <Input id="price" name="price" value={formData.price} onChange={handleChange} required />
                        <InputError message={errors.price} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="takeaway_price">Takeaway Price</Label>
                        <Input
                            id="takeaway_price"
                            name="takeaway_price"
                            value={formData.takeaway_price}
                            onChange={handleChange}
                            placeholder="Leave blank to use normal price"
                        />
                        <InputError message={errors.takeaway_price} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="category_id">Category</Label>
                        <select id="category_id" name="category_id" value={formData.category_id} onChange={handleChange} className="rounded-md border p-2">
                            <option value="">Select category</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.category_id} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input id="quantity" name="quantity" value={formData.quantity} onChange={handleChange} required />
                        <InputError message={errors.quantity} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="image">Image</Label>
                        <input
                            ref={fileInputRef}
                            id="image"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="rounded-md border border-input px-3 py-2"
                        />
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
