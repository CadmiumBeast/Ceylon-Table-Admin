import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';

type TableRecord = {
	id: number;
	name: string;
	is_available: boolean;
	is_active: boolean;
	created_at: string;
};

interface TablesIndexProps {
	tables: TableRecord[];
}

const breadcrumbs: BreadcrumbItem[] = [
	{
		title: 'Tables',
		href: '/tables',
	},
];

export default function TablesIndex({ tables }: TablesIndexProps) {
	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Tables" />

			<div className="space-y-6 p-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h1 className="text-2xl font-semibold">Tables</h1>
						<p className="text-sm text-muted-foreground">Create new dining tables and review their current status.</p>
					</div>
					<Button asChild>
						<Link href={route('table.create')}>Create Table</Link>
					</Button>
				</div>

				<div className="overflow-x-auto rounded-lg border bg-card shadow-xs">
					<table className="w-full min-w-[720px] text-sm">
						<thead className="bg-muted/40 text-left">
							<tr>
								<th className="px-4 py-3 font-medium">Table</th>
								<th className="px-4 py-3 font-medium">Available</th>
								<th className="px-4 py-3 font-medium">Active</th>
								<th className="px-4 py-3 font-medium">Created</th>
								<th className="px-4 py-3 font-medium text-right">Actions</th>
							</tr>
						</thead>
						<tbody>
							{tables.length === 0 ? (
								<tr>
									<td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
										No tables found.
									</td>
								</tr>
							) : (
								tables.map((table) => (
									<tr key={table.id} className="border-t">
										<td className="px-4 py-3 font-medium">{table.name}</td>
										<td className="px-4 py-3">
											<Badge variant={table.is_available ? 'default' : 'secondary'} className="capitalize">
												{table.is_available ? 'Available' : 'Unavailable'}
											</Badge>
										</td>
										<td className="px-4 py-3">
											<Badge variant={table.is_active ? 'default' : 'destructive'} className="capitalize">
												{table.is_active ? 'Active' : 'Disabled'}
											</Badge>
										</td>
										<td className="px-4 py-3 text-muted-foreground">
											{new Date(table.created_at).toLocaleString()}
										</td>
										<td className="px-4 py-3 text-right">
												<Button variant={table.is_active ? 'destructive' : 'default'} size="sm" asChild>
													<Link
														href={route(table.is_active ? 'table.disable' : 'table.enable', table.id)}
														method="post"
														as="button"
													>
														{table.is_active ? 'Disable' : 'Enable'}
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
