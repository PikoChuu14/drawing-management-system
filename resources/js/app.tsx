import { createInertiaApp } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
};

const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    navigatorWithStandalone.standalone === true;

if (isStandalone) {
    document.documentElement.classList.add('pwa-standalone');

    const preventPageGesture = (event: Event) => {
        const target = event.target as HTMLElement | null;

        if (target?.closest('[data-aps-viewer]')) {
            return;
        }

        event.preventDefault();
    };

    document.addEventListener('gesturestart', preventPageGesture, {
        passive: false,
    });

    document.addEventListener('gesturechange', preventPageGesture, {
        passive: false,
    });
}

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

if (
    'serviceWorker' in navigator &&
    import.meta.env.PROD
) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js', {
                scope: '/',
            })
            .catch((error: unknown) => {
                console.error(
                    'Service worker registration failed:',
                    error,
                );
            });
    });
}

// This will set light / dark mode on load...
initializeTheme();
