import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import {
    useEffect,
    type ReactNode,
} from 'react';

type FormModalProps = {
    open: boolean;
    title: string;
    description?: string;
    onClose: () => void;
    children: ReactNode;
};

export default function FormModal({
    open,
    title,
    description,
    onClose,
    children,
}: FormModalProps) {
    useEffect(() => {
        if (!open) {
            return;
        }

        const previousOverflow =
            document.body.style.overflow;

        const handleKeyDown = (
            event: KeyboardEvent,
        ) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.body.style.overflow = 'hidden';

        document.addEventListener(
            'keydown',
            handleKeyDown,
        );

        return () => {
            document.body.style.overflow =
                previousOverflow;

            document.removeEventListener(
                'keydown',
                handleKeyDown,
            );
        };
    }, [open, onClose]);

    if (!open) {
        return null;
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-2 sm:p-6"
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget
                ) {
                    onClose();
                }
            }}
        >
            <div className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b p-5 sm:p-6">
                    <div>
                        <h2 className="text-xl font-semibold">
                            {title}
                        </h2>

                        {description && (
                            <p className="mt-1 text-sm text-muted-foreground">
                                {description}
                            </p>
                        )}
                    </div>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Close"
                        onClick={onClose}
                    >
                        <X className="size-5" />
                    </Button>
                </div>

                <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}