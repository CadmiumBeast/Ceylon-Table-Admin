import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem, type User } from '@/types';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

interface UsersIndexProps {
	users: User[];
}

const breadcrumbs: BreadcrumbItem[] = [
	{
		title: 'Users',
		href: '/users',
	},
];

export default function UsersIndex({ users }: UsersIndexProps) {
	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Users" />

			<div className="space-y-6 p-4">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-semibold">Users</h1>
					<Button asChild>
						<Link href={route('users.create')}>Create User</Link>
					</Button>
				</div>

				<div className="overflow-x-auto rounded-lg border bg-card shadow-xs">
					<table className="w-full min-w-[700px] text-sm">
						<thead className="bg-muted/40 text-left">
							<tr>
								<th className="px-4 py-3 font-medium">Name</th>
								<th className="px-4 py-3 font-medium">Email</th>
								<th className="px-4 py-3 font-medium">Type</th>
								<th className="px-4 py-3 font-medium">Created</th>
								<th className="px-4 py-3 font-medium text-right">Actions</th>
							</tr>
						</thead>
						<tbody>
							{users.length === 0 ? (
								<tr>
									<td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
										No users found.
									</td>
								</tr>
							) : (
								users.map((user) => (
									<tr key={user.id} className="border-t">
										<td className="px-4 py-3">{user.name}</td>
										<td className="px-4 py-3">{user.email}</td>
										<td className="px-4 py-3">
											<Badge variant="secondary" className="capitalize">
												{user.type}
											</Badge>
										</td>
										<td className="px-4 py-3">{new Date(user.created_at).toLocaleDateString()}</td>
										<td className="px-4 py-3 text-right">
											<Button variant="outline" size="sm" asChild>
												<Link href={route('users.edit', user.id)}>Edit</Link>
											</Button>
                                            <Button variant="destructive" size="sm" className="ml-2" asChild>
                                                <Link href={route('users.destroy', user.id)} method="delete" as="button">
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
