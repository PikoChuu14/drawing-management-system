declare namespace Autodesk {
    namespace Viewing {
        interface Document {
            getRoot(): {
                getDefaultGeometry(): unknown;
            };
        }

        interface InitializerOptions {
            env?: string;
            api?: string;
            getAccessToken?: (
                callback?: (
                    accessToken: string,
                    expires: number,
                ) => void,
            ) => void;
        }

        const Document: {
            load: (
                urn: string,
                onLoad: (document: Document) => void,
                onError: (
                    code: number,
                    message: string,
                    errors: unknown[],
                ) => void,
            ) => void;
        };

        const Initializer: (
            options: InitializerOptions,
            callback: () => void,
        ) => void;

        class GuiViewer3D {
            constructor(
                container: HTMLElement,
                options?: {
                    extensions?: string[];
                },
            );
            start(): number;
            setTheme(theme: string): void;
            loadDocumentNode(
                document: Document,
                viewable: unknown,
            ): Promise<void>;
            fitToView(): void;
            finish(): void;
        }
    }
}
