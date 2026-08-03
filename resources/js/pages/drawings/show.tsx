import { Head, Link, useForm } from '@inertiajs/react';
import { useRef } from 'react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Project = {
    id: number;
    project_code: string;
    name: string;
};

type Revision = {
    id: number;
    revision_code: string;
    original_filename: string;
    file_extension: string | null;
    file_size: number;
    revision_notes: string | null;
    issued_at: string | null;
    uploaded_by: string;
    uploaded_at: string;
};

type Drawing = {
    id: number;
    drawing_number: string;
    title: string;
    discipline: string | null;
    status: string;
    description: string | null;
    creator_name: string;
    revisions: Revision[];
};

type RevisionForm = {
    revision_code: string;
    issued_at: string;
    revision_notes: string;
    file: File | null;
};

type DrawingShowProps = {
    project: Project;
    drawing: Drawing;
};

function formatStatus(status: string): string {
    return status.replaceAll('_', ' ');
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DrawingShow({ project, drawing }: DrawingShowProps) {
    const fileInput = useRef<HTMLInputElement>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Projects',
            href: '/projects',
        },
        {
            title: project.project_code,
            href: `/projects/${project.id}`,
        },
        {
            title: drawing.drawing_number,
            href: `/projects/${project.id}/drawings/${drawing.id}`,
        },
    ];

    const form = useForm<RevisionForm>({
        revision_code: '',
        issued_at: '',
        revision_notes: '',
        file: null,
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.post(`/projects/${project.id}/drawings/${drawing.id}/revisions`, {
            forceFormData: true,
            preserveScroll: true,

            onSuccess: () => {
                form.reset();

                if (fileInput.current) {
                    fileInput.current.value = '';
                }
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${drawing.drawing_number} Revisions`} />

            <div className="flex flex-1 flex-col gap-6 p-4">
                <header>
                    <Link
                        href={`/projects/${project.id}`}
                        className="text-sm text-muted-foreground hover:text-foreground"
                    >
                        ← Back to drawing register
                    </Link>

                    <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row">
                        <div>
                            <p className="font-mono text-sm font-medium text-muted-foreground">
                                {drawing.drawing_number}
                            </p>

                            <h1 className="mt-1 text-2xl font-semibold">
                                {drawing.title}
                            </h1>

                            {drawing.description && (
                                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                                    {drawing.description}
                                </p>
                            )}
                        </div>

                        <div className="text-sm">
                            <p>Discipline: {drawing.discipline ?? 'Not set'}</p>

                            <p className="capitalize">
                                Status: {formatStatus(drawing.status)}
                            </p>

                            <p className="text-muted-foreground">
                                Registered by {drawing.creator_name}
                            </p>
                        </div>
                    </div>
                </header>

                <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
                    <section className="rounded-xl border bg-card p-6 shadow-sm">
                        <h2 className="text-lg font-semibold">
                            Upload Revision
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Add a PDF, DWG or DXF revision file.
                        </p>

                        <form onSubmit={submit} className="mt-6 space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="revision_code">
                                    Revision Code
                                </Label>

                                <Input
                                    id="revision_code"
                                    value={form.data.revision_code}
                                    onChange={(event) =>
                                        form.setData(
                                            'revision_code',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Example: 0, A or B"
                                />

                                {form.errors.revision_code && (
                                    <p className="text-sm text-red-600">
                                        {form.errors.revision_code}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="issued_at">Issue Date</Label>

                                <Input
                                    id="issued_at"
                                    type="date"
                                    value={form.data.issued_at}
                                    onChange={(event) =>
                                        form.setData(
                                            'issued_at',
                                            event.target.value,
                                        )
                                    }
                                />

                                {form.errors.issued_at && (
                                    <p className="text-sm text-red-600">
                                        {form.errors.issued_at}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="file">Revision File</Label>

                                <Input
                                    ref={fileInput}
                                    id="file"
                                    type="file"
                                    accept=".pdf,.dwg,.dxf"
                                    onChange={(event) =>
                                        form.setData(
                                            'file',
                                            event.target.files?.[0] ?? null,
                                        )
                                    }
                                />

                                <p className="text-xs text-muted-foreground">
                                    PDF, DWG or DXF. Maximum 50 MB.
                                </p>

                                {form.errors.file && (
                                    <p className="text-sm text-red-600">
                                        {form.errors.file}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="revision_notes">
                                    Revision Notes
                                </Label>

                                <textarea
                                    id="revision_notes"
                                    rows={4}
                                    value={form.data.revision_notes}
                                    onChange={(event) =>
                                        form.setData(
                                            'revision_notes',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Describe what changed..."
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                />

                                {form.errors.revision_notes && (
                                    <p className="text-sm text-red-600">
                                        {form.errors.revision_notes}
                                    </p>
                                )}
                            </div>

                            {form.progress && (
                                <div className="space-y-2">
                                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full bg-primary transition-all"
                                            style={{
                                                width: `${form.progress.percentage ?? 0}%`,
                                            }}
                                        />
                                    </div>

                                    <p className="text-center text-xs text-muted-foreground">
                                        {form.progress.percentage ?? 0}%
                                        uploaded
                                    </p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={form.processing}
                                className="w-full"
                            >
                                {form.processing
                                    ? 'Uploading...'
                                    : 'Upload Revision'}
                            </Button>
                        </form>
                    </section>

                    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                        <div className="border-b p-6">
                            <h2 className="text-lg font-semibold">
                                Revision History
                            </h2>

                            <p className="mt-1 text-sm text-muted-foreground">
                                {drawing.revisions.length}{' '}
                                {drawing.revisions.length === 1
                                    ? 'revision'
                                    : 'revisions'}
                            </p>
                        </div>

                        {drawing.revisions.length === 0 ? (
                            <div className="p-10 text-center">
                                <p className="font-medium">
                                    No revisions uploaded
                                </p>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Upload the initial drawing revision.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b bg-muted/50">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">
                                                Revision
                                            </th>

                                            <th className="px-6 py-3 font-medium">
                                                File
                                            </th>

                                            <th className="px-6 py-3 font-medium">
                                                Notes
                                            </th>

                                            <th className="px-6 py-3 font-medium">
                                                Uploaded
                                            </th>

                                            <th className="px-6 py-3 font-medium">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {drawing.revisions.map((revision) => (
                                            <tr
                                                key={revision.id}
                                                className="border-b last:border-b-0"
                                            >
                                                <td className="px-6 py-4">
                                                    <p className="font-mono font-semibold">
                                                        {revision.revision_code}
                                                    </p>

                                                    <p className="text-xs text-muted-foreground">
                                                        Issued:{' '}
                                                        {revision.issued_at ??
                                                            'Not set'}
                                                    </p>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <p className="max-w-64 font-medium break-all">
                                                        {
                                                            revision.original_filename
                                                        }
                                                    </p>

                                                    <p className="text-xs text-muted-foreground uppercase">
                                                        {revision.file_extension ??
                                                            'File'}{' '}
                                                        ·{' '}
                                                        {formatFileSize(
                                                            revision.file_size,
                                                        )}
                                                    </p>
                                                </td>

                                                <td className="px-6 py-4 text-muted-foreground">
                                                    {revision.revision_notes ??
                                                        'No notes'}
                                                </td>

                                                <td className="px-6 py-4">
                                                    <p>
                                                        {revision.uploaded_by}
                                                    </p>

                                                    <p className="text-xs text-muted-foreground">
                                                        {revision.uploaded_at}
                                                    </p>
                                                </td>

                                                <td className="px-6 py-4">
                                                    <Button
                                                        asChild
                                                        variant="outline"
                                                        size="sm"
                                                    >
                                                        <a
                                                            href={`/projects/${project.id}/drawings/${drawing.id}/revisions/${revision.id}/download`}
                                                        >
                                                            Download
                                                        </a>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
