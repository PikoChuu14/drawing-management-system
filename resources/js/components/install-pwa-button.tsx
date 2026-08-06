import { Button } from '@/components/ui/button';
import {
    Download,
    Share2,
    X,
} from 'lucide-react';
import {
    useEffect,
    useState,
} from 'react';

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

export default function InstallPwaButton() {
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
    ] = useState(false);

    const isAppleMobile =
        typeof navigator !== 'undefined' &&
        /iPad|iPhone|iPod/.test(
            navigator.userAgent,
        );

    useEffect(() => {
        const standaloneMedia =
            window.matchMedia(
                '(display-mode: standalone)',
            );

        const appleStandalone =
            (
                navigator as Navigator & {
                    standalone?: boolean;
                }
            ).standalone === true;

        setIsInstalled(
            standaloneMedia.matches ||
                appleStandalone,
        );

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
                className="h-11 gap-2"
                onClick={handleInstall}
            >
                <Download className="size-4" />
                Install App
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
                            {isAppleMobile ? (
                                <>
                                    <div className="flex gap-4">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                            1
                                        </div>

                                        <div>
                                            <p className="font-medium">
                                                Open the
                                                Share
                                                menu
                                            </p>

                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Tap the
                                                Share
                                                button in
                                                Safari.
                                            </p>
                                        </div>

                                        <Share2 className="size-5 shrink-0" />
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                            2
                                        </div>

                                        <div>
                                            <p className="font-medium">
                                                Select Add
                                                to Home
                                                Screen
                                            </p>

                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Scroll the
                                                Share menu
                                                when the
                                                option is
                                                not
                                                immediately
                                                visible.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                            3
                                        </div>

                                        <div>
                                            <p className="font-medium">
                                                Tap Add
                                            </p>

                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Launch
                                                Drawing
                                                DMS from
                                                its new
                                                Home
                                                Screen
                                                icon.
                                            </p>
                                        </div>
                                    </div>
                                </>
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