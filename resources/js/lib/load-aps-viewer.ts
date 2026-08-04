const VIEWER_SCRIPT_ID = 'aps-viewer-script';
const VIEWER_STYLE_ID = 'aps-viewer-style';

const VIEWER_SCRIPT_URL =
    'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.js';

const VIEWER_STYLE_URL =
    'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.css';

let viewerLoaderPromise: Promise<void> | null = null;

/**
 * Load the Autodesk Viewer JavaScript and stylesheet once.
 */
export function loadApsViewer(): Promise<void> {
    if (typeof Autodesk !== 'undefined' && Autodesk.Viewing) {
        return Promise.resolve();
    }

    if (viewerLoaderPromise) {
        return viewerLoaderPromise;
    }

    viewerLoaderPromise = new Promise<void>((resolve, reject) => {
        addViewerStylesheet();

        const existingScript = document.getElementById(
            VIEWER_SCRIPT_ID,
        ) as HTMLScriptElement | null;

        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(), {
                once: true,
            });

            existingScript.addEventListener(
                'error',
                () =>
                    reject(
                        new Error(
                            'The Autodesk Viewer SDK could not be loaded.',
                        ),
                    ),
                { once: true },
            );

            return;
        }

        const script = document.createElement('script');

        script.id = VIEWER_SCRIPT_ID;
        script.src = VIEWER_SCRIPT_URL;
        script.async = true;

        script.addEventListener(
            'load',
            () => {
                if (typeof Autodesk === 'undefined' || !Autodesk.Viewing) {
                    reject(
                        new Error(
                            'The Autodesk Viewer SDK loaded without its expected API.',
                        ),
                    );

                    return;
                }

                resolve();
            },
            { once: true },
        );

        script.addEventListener(
            'error',
            () =>
                reject(
                    new Error(
                        'The Autodesk Viewer SDK could not be downloaded.',
                    ),
                ),
            { once: true },
        );

        document.head.appendChild(script);
    });

    return viewerLoaderPromise;
}

function addViewerStylesheet(): void {
    if (document.getElementById(VIEWER_STYLE_ID)) {
        return;
    }

    const link = document.createElement('link');

    link.id = VIEWER_STYLE_ID;
    link.rel = 'stylesheet';
    link.href = VIEWER_STYLE_URL;

    document.head.appendChild(link);
}
