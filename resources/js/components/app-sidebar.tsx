import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem} from '@/components/ui/sidebar';
import { type NavItem, type SharedData, type User } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { LayoutGrid, User as UserIcon, Users, Armchair, SquareStack, ClipboardList, ShoppingBag, ShoppingCart, CircleCheckBig } from 'lucide-react';
import AppLogo from './app-logo';

type SidebarNavItem = NavItem & {
    visibleFor: User['type'][];
};

const mainNavItems: SidebarNavItem[] = [
    {
        title: 'Dashboard',
        url: '/dashboard',
        icon: LayoutGrid,
        visibleFor: ['admin', 'manager', 'staff'],
    },
    {
        title: 'Open Orders',
        url: '/orders',
        icon: ShoppingBag,
        visibleFor: ['admin','staff'],
    },
    {
        title: 'Completed Orders',
        url: '/orders/completed',
        icon: CircleCheckBig,
        visibleFor: ['admin', 'manager'],
    },
    {
        title: 'Active Carts',
        url: '/carts',
        icon: ShoppingCart,
        visibleFor: ['admin'],
    },
    {
        title: 'Users',
        url: '/users',
        icon: UserIcon,
        visibleFor: ['admin'],
    },
    {
        title: 'Customers',
        url: '/customers',
        icon: Users,
        visibleFor: ['admin', 'manager', 'staff'],
    },
    {
        title: 'Tables',
        url: '/tables',
        icon: Armchair,
        visibleFor: ['admin', 'manager'],
    },
    {
        title: 'Categories',
        url: '/categories',
        icon: SquareStack,
        visibleFor: ['admin'],
    },
    {
        title: 'Items',
        url: '/items',
        icon: ClipboardList,
        visibleFor: ['admin', 'manager'],
    },
    {
        title: 'Juice Bar',
        url: '/juice-bar',
        icon: ShoppingBag,
        visibleFor: ['admin', 'manager', 'staff'],
    },
    {
        title: 'Reports',
        url: '/reports/sales',
        icon: ClipboardList,
        visibleFor: ['admin', 'manager'],
    }


];

// const footerNavItems: NavItem[] = [
//     {
//         title: 'Repository',
//         url: 'https://github.com/laravel/react-starter-kit',
//         icon: Folder,
//     },
//     {
//         title: 'Documentation',
//         url: 'https://laravel.com/docs/starter-kits',
//         icon: BookOpen,
//     },
// ];

export function AppSidebar() {
    const page = usePage<SharedData>();
    const { auth } = page.props;
    const visibleNavItems = mainNavItems.filter((item) => item.visibleFor.includes(auth.user.type));

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={visibleNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
