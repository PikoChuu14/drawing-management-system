import { useEffect, useRef, useState } from 'react';
import { loadApsViewer } from '@/lib/load-aps-viewer';
import { cn } from '@/lib/utils';

type ViewerTokenResponse = {
    access_token: string;
    expires_in: number;
};

type ApsViewerProps = {
    urn: string;
    tokenUrl: string;
    api: string;
    className?: string;
};

export default function ApsViewer({ urn, tokenUrl, api, className }: ApsViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    const viewerRef = useRef<Autodesk.Viewing.GuiViewer3D | null>(null);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const container = containerRef.current;
        let resizeObserver: ResizeObserver | null = null;

        if (!container) {
            return;
        }

        const startViewer = async () => {
            setLoading(true);
            setError(null);

            try {
                await loadApsViewer();

                if (cancelled || !container) {
                    return;
                }

                const getAccessToken = (
                    callback?: (accessToken: string, expiresIn: number) => void,
                ) => {
                    fetch(tokenUrl, {
                        method: 'GET',
                        credentials: 'same-origin',
                        headers: {
                            Accept: 'application/json',
                        },
                    })
                        .then(async (response) => {
                            if (!response.ok) {
                                throw new Error(
                                    `Viewer token request failed (${response.status}).`,
                                );
                            }

                            return (await response.json()) as ViewerTokenResponse;
                        })
                        .then((token) => {
                            if (callback) {
                                callback(token.access_token, token.expires_in);
                            }
                        })
                        .catch((tokenError: unknown) => {
                            const message =
                                tokenError instanceof Error
                                    ? tokenError.message
                                    : 'The Viewer token could not be retrieved.';

                            setError(message);
                            setLoading(false);
                        });
                };

                Autodesk.Viewing.Initializer(
                    {
                        env: 'AutodeskProduction2',
                        api,
                        getAccessToken,
                    },
                    () => {
                        if (cancelled || !container) {
                            return;
                        }

                        const viewer = new Autodesk.Viewing.GuiViewer3D(
                            container,
                            {
                                extensions: ['Autodesk.DocumentBrowser'],
                            },
                        );

                        viewerRef.current = viewer;

                        const viewerWithResize = viewer as Autodesk.Viewing.GuiViewer3D & {
                            resize?: () => void;
                        };

                        resizeObserver = new ResizeObserver(() => {
                            viewerWithResize.resize?.();
                        });

                        resizeObserver.observe(container);

                        const startResult = viewer.start();

                        if (startResult !== 0) {
                            setError(
                                `Autodesk Viewer could not start. Error code: ${startResult}.`,
                            );

                            setLoading(false);

                            return;
                        }

                        viewer.setTheme('light-theme');

                        Autodesk.Viewing.Document.load(
                            `urn:${urn}`,
                            (document: Autodesk.Viewing.Document) => {
                                const viewable = document
                                    .getRoot()
                                    .getDefaultGeometry();

                                if (!viewable) {
                                    setError(
                                        'APS did not return a viewable sheet or model.',
                                    );

                                    setLoading(false);

                                    return;
                                }

                                viewer
                                    .loadDocumentNode(document, viewable)
                                    .then(() => {
                                        if (cancelled) {
                                            return;
                                        }

                                        viewer.fitToView();
                                        setLoading(false);
                                    })
                                    .catch((loadError: unknown) => {
                                        const message =
                                            loadError instanceof Error
                                                ? loadError.message
                                                : 'The translated drawing could not be loaded.';

                                        setError(message);

                                        setLoading(false);
                                    });
                            },
                            (
                                code: number,
                                message: string,
                                errors: unknown[],
                            ) => {
                                console.error('APS document load failure', {
                                    code,
                                    message,
                                    errors,
                                });

                                setError(
                                    `The DWG document could not be loaded: ${message ?? `error ${code}`}`,
                                );

                                setLoading(false);
                            },
                        );
                    },
                );
            } catch (viewerError: unknown) {
                const message =
                    viewerError instanceof Error
                        ? viewerError.message
                        : 'The Autodesk Viewer could not be initialized.';

                setError(message);
                setLoading(false);
            }
        };

        void startViewer();

        return () => {
            cancelled = true;

            resizeObserver?.disconnect();

            const viewer = viewerRef.current;

            if (viewer) {
                viewer.finish();
                viewerRef.current = null;
            }

            if (container) {
                container.innerHTML = '';
            }
        };
    }, [api, tokenUrl, urn]);

    return (
        
            <div
                className={cn(
                    'relative min-h-[420px] w-full overflow-hidden rounded-lg bg-neutral-900',
                    className,
                )}
            >

            <div ref={containerRef} className="absolute inset-0" />

            {loading && !error && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/90">
                    <div className="text-center">
                        <p className="font-medium">Loading DWG viewer…</p>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Retrieving the translated drawing from Autodesk APS.
                        </p>
                    </div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-background p-6">
                    <div className="max-w-lg rounded-xl border border-destructive/40 bg-destructive/10 p-5 text-center">
                        <p className="font-medium text-destructive">
                            DWG preview failed
                        </p>

                        <p className="mt-2 text-sm text-muted-foreground">
                            {error}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
