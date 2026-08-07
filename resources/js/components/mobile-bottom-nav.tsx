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

export default function MobileBottomNav() {
    const { url } = usePage();

    const activeIndex = Math.max(
        0,
        items.findIndex((item) => {
            if (item.href === dashboard()) {
                return url === dashboard();
            }

            return (
                url === item.href ||
                url.startsWith(`${item.href}/`) ||
                url.startsWith(`${item.href}?`)
            );
        }),
    );

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[150] flex justify-center px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:hidden">
            <nav className="pointer-events-auto relative grid h-16 w-full max-w-sm grid-cols-4 overflow-hidden rounded-[2rem] border bg-background/90 p-1 shadow-2xl backdrop-blur-xl">
                <div
                    aria-hidden="true"
                    className="absolute top-1 bottom-1 left-1 rounded-[1.65rem] bg-foreground transition-transform duration-300 ease-out"
                    style={{
                        width: 'calc((100% - 0.5rem) / 4)',
                        transform: `translateX(${activeIndex * 100}%)`,
                    }}
                />

                {items.map((item, index) => {
                    const Icon = item.icon;
                    const active = index === activeIndex;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-label={item.label}
                            className={`relative z-10 flex min-w-0 items-center justify-center rounded-full transition-colors duration-300 ${
                                active
                                    ? 'text-background'
                                    : 'text-muted-foreground'
                            }`}
                        >
                            <Icon className="size-6" />

                            <span className="sr-only">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
