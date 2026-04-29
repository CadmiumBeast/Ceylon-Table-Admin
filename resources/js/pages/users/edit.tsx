import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type User } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface EditUserProps {
	user: User;
}

interface EditUserForm {
	name: string;
	email: string;
	password: string;
	password_confirmation: string;
	type: 'customer' | 'admin' | 'chef' | 'staff';
	first_name: string;
	last_name: string;
	phone_number: string;
	address: string;
	date_of_birth: string;
	[key: string]: string;
}

export default function EditUser({ user }: EditUserProps) {
	const breadcrumbs: BreadcrumbItem[] = [
		{
			title: 'Users',
			href: '/users',
		},
		{
			title: 'Edit',
			href: `/users/${user.id}/edit`,
		},
	];

	const { data, setData, put, processing, errors } = useForm<EditUserForm>({
		name: user.name,
		email: user.email,
		password: '',
		password_confirmation: '',
		type: user.type,
		first_name: user.customer?.first_name ?? '',
		last_name: user.customer?.last_name ?? '',
		phone_number: user.customer?.phone_number ?? '',
		address: user.customer?.address ?? '',
		date_of_birth: user.customer?.date_of_birth ?? '',
	});

	const isCustomer = data.type === 'customer';

	const submit: FormEventHandler = (e) => {
		e.preventDefault();
		put(route('users.update', user.id));
	};

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Edit User" />

			<div className="max-w-3xl space-y-6 p-4">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-semibold">Edit User</h1>
					<Button variant="outline" asChild>
						<Link href={route('users.index')}>Back</Link>
					</Button>
				</div>

				<form onSubmit={submit} className="space-y-5 rounded-lg border bg-card p-6 shadow-xs">
					<div className="grid gap-2">
						<Label htmlFor="name">Name</Label>
						<Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required />
						<InputError message={errors.name} />
					</div>

					<div className="grid gap-2">
						<Label htmlFor="email">Email</Label>
						<Input id="email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} required />
						<InputError message={errors.email} />
					</div>

					<div className="grid gap-2">
						<Label htmlFor="type">Type</Label>
						<select
							id="type"
							className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
							value={data.type}
							onChange={(e) => setData('type', e.target.value as EditUserForm['type'])}
						>
							<option value="customer">Customer</option>
							<option value="admin">Admin</option>
							<option value="chef">Chef</option>
							<option value="staff">Staff</option>
						</select>
						<InputError message={errors.type} />
					</div>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div className="grid gap-2">
							<Label htmlFor="password">Password (leave blank to keep current)</Label>
							<Input id="password" type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} />
							<InputError message={errors.password} />
						</div>

						<div className="grid gap-2">
							<Label htmlFor="password_confirmation">Confirm Password</Label>
							<Input
								id="password_confirmation"
								type="password"
								value={data.password_confirmation}
								onChange={(e) => setData('password_confirmation', e.target.value)}
							/>
							<InputError message={errors.password_confirmation} />
						</div>
					</div>

					{isCustomer && (
						<div className="space-y-4 rounded-md border p-4">
							<h2 className="text-sm font-semibold">Customer Details</h2>

							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div className="grid gap-2">
									<Label htmlFor="first_name">First Name</Label>
									<Input
										id="first_name"
										value={data.first_name}
										onChange={(e) => setData('first_name', e.target.value)}
										required={isCustomer}
									/>
									<InputError message={errors.first_name} />
								</div>

								<div className="grid gap-2">
									<Label htmlFor="last_name">Last Name</Label>
									<Input
										id="last_name"
										value={data.last_name}
										onChange={(e) => setData('last_name', e.target.value)}
										required={isCustomer}
									/>
									<InputError message={errors.last_name} />
								</div>
							</div>

							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div className="grid gap-2">
									<Label htmlFor="phone_number">Phone Number</Label>
									<Input
										id="phone_number"
										value={data.phone_number}
										onChange={(e) => setData('phone_number', e.target.value)}
										required={isCustomer}
									/>
									<InputError message={errors.phone_number} />
								</div>

								<div className="grid gap-2">
									<Label htmlFor="date_of_birth">Date of Birth</Label>
									<Input
										id="date_of_birth"
										type="date"
										value={data.date_of_birth}
										onChange={(e) => setData('date_of_birth', e.target.value)}
									/>
									<InputError message={errors.date_of_birth} />
								</div>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="address">Address</Label>
								<textarea
									id="address"
									className="min-h-[90px] rounded-md border border-input bg-background px-3 py-2 text-sm"
									value={data.address}
									onChange={(e) => setData('address', e.target.value)}
								/>
								<InputError message={errors.address} />
							</div>
						</div>
					)}

					<Button type="submit" disabled={processing}>
						Update User
					</Button>
				</form>
			</div>
		</AppLayout>
	);
}
