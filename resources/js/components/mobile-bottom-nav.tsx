import { Link, usePage } from '@inertiajs/react';
import {
    Archive,
    LayoutDashboard,
    PanelsTopLeft,
    Trash2,
} from 'lucide-react';

import { dashboard } from '@/routes';

const items = [
    {
        label: 'Home',
        href: dashboard(),
        icon: LayoutDashboard,
    },
    {
        label: 'Projects',
        href: '/projects',
        icon: PanelsTopLeft,
    },
    {
        label: 'Archived',
        href: '/archived',
        icon: Archive,
    },
    {
        label: 'Trash',
        href: '/trash',
        icon: Trash2,
    },
];

function isActiveUrl(url: string, href: string): boolean {
    return (
        url === href ||
        url.startsWith(`${href}/`) ||
        url.startsWith(`${href}?`)
    );
}

export default function MobileBottomNav() {
    const { url } = usePage();

    return (
        <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
            {items.map((item) => {
                const Icon = item.icon;
                const active = isActiveUrl(url, item.href);

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] ${
                            active ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                    >
                        <Icon className="size-5" />
                        {item.label}
                    </Link>
                );
            })}
        </nav>
    );
}