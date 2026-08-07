import {
    Download,
    X,
} from 'lucide-react';
import {
    useEffect,
    useState,
} from 'react';
import { Button } from '@/components/ui/button';

type BeforeInstallPromptEvent =
    Event & {
        prompt: () => Promise<void>;

        userChoice: Promise<{
            outcome:
                | 'accepted'
                | 'dismissed';

            platform: string;
        }>;
    };

type Props = {
    compact?: boolean;
};

export default function InstallPwaButton({
    compact = false,
}: Props) {
    const getIsInstalled = () => {
        if (typeof window === 'undefined') {
            return false;
        }

        const navigatorWithStandalone = navigator as Navigator & {
            standalone?: boolean;
        };

        return (
            window.matchMedia('(display-mode: standalone)').matches ||
            navigatorWithStandalone.standalone === true
        );
    };

    const [
        installPrompt,
        setInstallPrompt,
    ] =
        useState<BeforeInstallPromptEvent | null>(
            null,
        );

    const [
        instructionsOpen,
        setInstructionsOpen,
    ] = useState(false);

    const [
        isInstalled,
        setIsInstalled,
    ] = useState(getIsInstalled);

    const userAgent =
        typeof navigator !== 'undefined'
            ? navigator.userAgent
            : '';

    const isIPad =
        /iPad/.test(userAgent) ||
        (
            typeof navigator !== 'undefined' &&
            navigator.platform === 'MacIntel' &&
            navigator.maxTouchPoints > 1
        );

    const isIPhone = /iPhone|iPod/.test(userAgent);

    const iPadSteps = [
        {
            title: 'Open the Share menu',
            description:
                'Tap the Share button in the top-right Safari toolbar.',
        },
        {
            title: 'Select Add to Home Screen',
            description:
                'Scroll through the Share actions when it is not immediately visible.',
        },
        {
            title: 'Tap Add',
            description:
                'Drawing DMS will appear on the iPad Home Screen.',
        },
    ];

    const iPhoneSteps = [
        {
            title: 'Show the Safari toolbar',
            description:
                'Tap the page once when the browser controls are hidden.',
        },
        {
            title: 'Tap Share',
            description:
                'Use the Share button in the iPhone Safari toolbar.',
        },
        {
            title: 'Choose Add to Home Screen',
            description:
                'Scroll down when necessary, then tap Add.',
        },
    ];

    const appleSteps = isIPad ? iPadSteps : iPhoneSteps;

    useEffect(() => {
        const handleInstallPrompt = (
            event: Event,
        ) => {
            event.preventDefault();

            setInstallPrompt(
                event as BeforeInstallPromptEvent,
            );
        };

        const handleInstalled = () => {
            setIsInstalled(true);
            setInstallPrompt(null);
            setInstructionsOpen(false);
        };

        window.addEventListener(
            'beforeinstallprompt',
            handleInstallPrompt,
        );

        window.addEventListener(
            'appinstalled',
            handleInstalled,
        );

        return () => {
            window.removeEventListener(
                'beforeinstallprompt',
                handleInstallPrompt,
            );

            window.removeEventListener(
                'appinstalled',
                handleInstalled,
            );
        };
    }, []);

    const handleInstall = async () => {
        if (installPrompt) {
            await installPrompt.prompt();

            const result =
                await installPrompt.userChoice;

            if (
                result.outcome ===
                'accepted'
            ) {
                setInstallPrompt(null);
            }

            return;
        }

        setInstructionsOpen(true);
    };

    if (isInstalled) {
        return null;
    }

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size={compact ? 'icon' : 'default'}
                className={compact ? 'size-10' : 'h-11 gap-2'}
                onClick={handleInstall}
                aria-label="Install Drawing DMS"
            >
                <Download className="size-4" />

                {!compact && <span>Install App</span>}
            </Button>

            {instructionsOpen && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Install application"
                    className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4"
                    onMouseDown={(
                        event,
                    ) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setInstructionsOpen(
                                false,
                            );
                        }
                    }}
                >
                    <div className="w-full max-w-md rounded-xl border bg-background shadow-2xl">
                        <div className="flex items-start justify-between gap-4 border-b p-5">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Install Drawing
                                    DMS
                                </h2>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Add the system
                                    to this
                                    device’s Home
                                    Screen.
                                </p>
                            </div>

                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label="Close"
                                onClick={() =>
                                    setInstructionsOpen(
                                        false,
                                    )
                                }
                            >
                                <X className="size-5" />
                            </Button>
                        </div>

                        <div className="space-y-5 p-5">
                            {isIPad || isIPhone ? (
                                <div className="space-y-5">
                                    <p className="text-sm font-medium">
                                        {isIPad
                                            ? 'Install on iPad'
                                            : 'Install on iPhone'}
                                    </p>

                                    {appleSteps.map((step, index) => (
                                        <div
                                            key={step.title}
                                            className="flex gap-4"
                                        >
                                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                                {index + 1}
                                            </div>

                                            <div>
                                                <p className="font-medium">
                                                    {step.title}
                                                </p>

                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    {step.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Open your browser
                                    menu and select
                                    Install App or Add
                                    to Home Screen.
                                </p>
                            )}

                            <Button
                                type="button"
                                className="h-11 w-full"
                                onClick={() =>
                                    setInstructionsOpen(
                                        false,
                                    )
                                }
                            >
                                Done
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}