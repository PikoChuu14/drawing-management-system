import { Head, Link, router, useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import ApsViewer from '@/components/aps-viewer';

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
    can_preview: boolean;
    translation_status:
        | 'not_started'
        | 'uploading'
        | 'processing'
        | 'ready'
        | 'failed';

    translation_progress: string | null;
    translation_error: string | null;
    translation_requested_at: string | null;
    translation_completed_at: string | null;

    can_view_dwg: boolean;
    aps_urn:string | null;
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
    issues: SiteIssue[];
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
    apsViewer: ApsViewerConfig;
};

type SiteIssue = {
    id: number;
    issue_number: string | null;
    title: string;
    description: string;
    location: string | null;
    priority: string;
    status: string;
    resolution: string | null;
    has_photo: boolean;
    reported_by: string;
    reported_at: string;
    resolved_at: string | null;
};

type IssueForm = {
    title: string;
    description: string;
    location: string;
    priority: string;
    photo: File | null;
};

type ApsViewerConfig = {
    token_url: string;
    api: string;
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

export default function DrawingShow({ project, drawing, apsViewer }: DrawingShowProps) {
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

    const [previewRevision, setPreviewRevision] =
        useState<Revision | null>(null);

    const getPreviewUrl = (revisionId: number) => {
        return `/projects/${project.id}/drawings/${drawing.id}/revisions/${revisionId}/preview`;
    };

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

    const issuePhotoInput = useRef<HTMLInputElement>(null);

    const issueForm = useForm<IssueForm>({
        title: '',
        description: '',
        location: '',
        priority: 'medium',
        photo: null,
    });

    const submitIssue = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        issueForm.post(
            `/projects/${project.id}/drawings/${drawing.id}/issues`,
            {
                forceFormData: true,
                preserveScroll: true,

                onSuccess: () => {
                    issueForm.reset();

                    if (issuePhotoInput.current) {
                        issuePhotoInput.current.value = '';
                    }
                },
            },
        );
    };

    const deleteDrawing = () => {
        if (
            window.confirm(
                'Move this drawing to the Trash? Its revision files will be retained.',
            )
        ) {
            router.delete(`/projects/${project.id}/drawings/${drawing.id}`);
        }
    };

    const [
        processingRevisionId,
        setProcessingRevisionId,
    ] = useState<number | null>(null);

    const [apsError, setApsError] =
        useState<string | null>(null);

    const processDwg = (revision: Revision) => {
        setApsError(null);

        router.post(
            `/projects/${project.id}/drawings/${drawing.id}/revisions/${revision.id}/aps/process`,
            {},
            {
                preserveScroll: true,

                onStart: () => {
                    setProcessingRevisionId(
                        revision.id,
                    );
                },

                onError: (errors) => {
                    setApsError(
                        errors.aps ??
                            'The DWG could not be processed.',
                    );
                },

                onFinish: () => {
                    setProcessingRevisionId(null);
                },
            },
        );
    };

    const refreshDwgStatus = (
        revision: Revision,
    ) => {
        setApsError(null);

        router.patch(
            `/projects/${project.id}/drawings/${drawing.id}/revisions/${revision.id}/aps/status`,
            {},
            {
                preserveScroll: true,

                onStart: () => {
                    setProcessingRevisionId(
                        revision.id,
                    );
                },

                onError: (errors) => {
                    setApsError(
                        errors.aps ??
                            'The translation status could not be refreshed.',
                    );
                },

                onFinish: () => {
                    setProcessingRevisionId(null);
                },
            },
        );
    };

    const [
        dwgPreviewRevision,
        setDwgPreviewRevision,
    ] = useState<Revision | null>(null);

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

                            <div className="mt-3 flex flex-wrap gap-2">
                                <Button asChild variant="outline">
                                    <Link
                                        href={`/projects/${project.id}/drawings/${drawing.id}/edit`}
                                    >
                                        Edit Drawing
                                    </Link>
                                </Button>

                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={deleteDrawing}
                                >
                                    Delete
                                </Button>
                            </div>

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

                            {apsError && (
                                <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                                    {apsError}
                                </div>
                            )}

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

                                                    {revision.file_extension?.toLowerCase() ===
                                                        'dwg' && (
                                                        <div className="mt-2 text-xs">
                                                            <p className="capitalize">
                                                                APS:{' '}
                                                                {formatStatus(
                                                                    revision.translation_status,
                                                                )}
                                                            </p>

                                                            {revision.translation_progress && (
                                                                <p className="mt-1 text-muted-foreground">
                                                                    {
                                                                        revision.translation_progress
                                                                    }
                                                                </p>
                                                            )}

                                                            {revision.translation_error && (
                                                                <p className="mt-1 max-w-72 text-red-600">
                                                                    {
                                                                        revision.translation_error
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
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
                                                    <div className="flex flex-wrap gap-2">
                                                        {revision.can_preview && (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant={
                                                                    previewRevision?.id ===
                                                                    revision.id
                                                                        ? 'default'
                                                                        : 'outline'
                                                                }
                                                                onClick={() => {
                                                                    setPreviewRevision(revision);
                                                                    setDwgPreviewRevision(null);

                                                                    window.setTimeout(() => {
                                                                        document
                                                                            .getElementById(
                                                                                'pdf-preview',
                                                                            )
                                                                            ?.scrollIntoView({
                                                                                behavior: 'smooth',
                                                                                block: 'start',
                                                                            });
                                                                    }, 0);
                                                                }}
                                                            >
                                                                {previewRevision?.id === revision.id
                                                                    ? 'Viewing'
                                                                    : 'Preview'}
                                                            </Button>
                                                        )}

                                                        {revision.file_extension?.toLowerCase() ===
                                                            'dwg' &&
                                                            (revision.translation_status ===
                                                                'not_started' ||
                                                                revision.translation_status ===
                                                                    'failed') && (
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    disabled={
                                                                        processingRevisionId ===
                                                                        revision.id
                                                                    }
                                                                    onClick={() =>
                                                                        processDwg(revision)
                                                                    }
                                                                >
                                                                    {processingRevisionId === revision.id
                                                                        ? 'Processing...'
                                                                        : revision.translation_status ===
                                                                            'failed'
                                                                          ? 'Retry Processing'
                                                                          : 'Process for Preview'}
                                                                </Button>
                                                            )}

                                                        {revision.file_extension?.toLowerCase() ===
                                                            'dwg' &&
                                                            (revision.translation_status ===
                                                                'processing' ||
                                                                revision.translation_status ===
                                                                    'uploading') && (
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    disabled={
                                                                        processingRevisionId ===
                                                                        revision.id
                                                                    }
                                                                    onClick={() =>
                                                                        refreshDwgStatus(revision)
                                                                    }
                                                                >
                                                                    {processingRevisionId === revision.id
                                                                        ? 'Checking...'
                                                                        : 'Refresh Status'}
                                                                </Button>
                                                            )}

                                                        {revision.file_extension?.toLowerCase() ===
                                                            'dwg' &&
                                                            revision.translation_status ===
                                                                'ready' && (
                                                                revision.can_view_dwg &&
                                                                    revision.aps_urn && (
                                                                        <Button
                                                                            type="button"
                                                                            size="sm"
                                                                            variant={
                                                                                dwgPreviewRevision?.id ===
                                                                                revision.id
                                                                                    ? 'default'
                                                                                    : 'outline'
                                                                            }
                                                                            onClick={() => {
                                                                                setDwgPreviewRevision(
                                                                                    revision,
                                                                                );
                                                                                                
                                                                                setPreviewRevision(null);

                                                                                window.setTimeout(() => {
                                                                                    document
                                                                                        .getElementById(
                                                                                            'dwg-preview',
                                                                                        )
                                                                                        ?.scrollIntoView({
                                                                                            behavior: 'smooth',
                                                                                            block: 'start',
                                                                                        });
                                                                                }, 0);
                                                                            }}
                                                                        >
                                                                            {dwgPreviewRevision?.id ===
                                                                            revision.id
                                                                                ? 'Viewing DWG'
                                                                                : 'Preview DWG'}
                                                                        </Button>
                                                                    )
                                                            )}

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
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>

                {dwgPreviewRevision &&
                    dwgPreviewRevision.aps_urn && (
                        <section
                            id="dwg-preview"
                            className="scroll-mt-6 overflow-hidden rounded-xl border bg-card shadow-sm"
                        >
                            <div className="flex flex-col justify-between gap-4 border-b p-4 sm:flex-row sm:items-center md:p-6">
                                <div className="min-w-0">
                                    <p className="text-sm text-muted-foreground">
                                        Interactive DWG Preview
                                    </p>

                                    <h2 className="mt-1 truncate text-lg font-semibold">
                                        Revision{' '}
                                        {dwgPreviewRevision.revision_code}{' '}
                                        —{' '}
                                        {dwgPreviewRevision.original_filename}
                                    </h2>

                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Use the Viewer controls to zoom, pan, select sheets, and inspect the translated drawing.
                                    </p>
                                </div>

                                <div className="flex shrink-0 flex-wrap gap-2">
                                    <Button
                                        asChild
                                        size="sm"
                                        variant="outline"
                                    >
                                        <a
                                            href={`/projects/${project.id}/drawings/${drawing.id}/revisions/${dwgPreviewRevision.id}/download`}
                                        >
                                            Download Original
                                        </a>
                                    </Button>

                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            setDwgPreviewRevision(null)
                                        }
                                    >
                                        Close Viewer
                                    </Button>
                                </div>
                            </div>

                            <div className="bg-muted/30 p-2 sm:p-4">
                                <ApsViewer
                                    key={dwgPreviewRevision.id}
                                    urn={dwgPreviewRevision.aps_urn}
                                    tokenUrl={apsViewer.token_url}
                                    api={apsViewer.api}
                                />
                            </div>
                        </section>
                    )}

                {previewRevision && (
                    <section
                        id="pdf-preview"
                        className="scroll-mt-6 overflow-hidden rounded-xl border bg-card shadow-sm"
                    >
                        <div className="flex flex-col justify-between gap-4 border-b p-4 sm:flex-row sm:items-center md:p-6">
                            <div className="min-w-0">
                                <p className="text-sm text-muted-foreground">
                                    PDF Preview
                                </p>

                                <h2 className="mt-1 truncate text-lg font-semibold">
                                    Revision{' '}
                                    {previewRevision.revision_code} —{' '}
                                    {previewRevision.original_filename}
                                </h2>
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-2">
                                <Button asChild size="sm" variant="outline">
                                    <a
                                        href={getPreviewUrl(previewRevision.id)}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Open in New Tab
                                    </a>
                                </Button>

                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setPreviewRevision(null)}
                                >
                                    Close Preview
                                </Button>
                            </div>
                        </div>

                        <div className="bg-muted/30 p-2 sm:p-4">
                            <iframe
                                key={previewRevision.id}
                                src={getPreviewUrl(previewRevision.id)}
                                title={`PDF preview for revision ${previewRevision.revision_code}`}
                                className="h-[65vh] min-h-[420px] w-full rounded-lg border bg-white md:h-[75vh]"
                            />
                        </div>
                    </section>
                )}

                <section className="grid gap-6 xl:grid-cols-[380px_1fr]">
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <h2 className="text-lg font-semibold">
                            Report Site Issue
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Record a problem found at the site and link it to
                            this drawing.
                        </p>

                        <form onSubmit={submitIssue} className="mt-6 space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="issue_title">Issue Title</Label>

                                <Input
                                    id="issue_title"
                                    value={issueForm.data.title}
                                    onChange={(event) =>
                                        issueForm.setData(
                                            'title',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Example: Support clashes with column"
                                />

                                {issueForm.errors.title && (
                                    <p className="text-sm text-red-600">
                                        {issueForm.errors.title}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="issue_location">
                                    Site Location
                                </Label>

                                <Input
                                    id="issue_location"
                                    value={issueForm.data.location}
                                    onChange={(event) =>
                                        issueForm.setData(
                                            'location',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Example: Zone B, Row 4"
                                />

                                {issueForm.errors.location && (
                                    <p className="text-sm text-red-600">
                                        {issueForm.errors.location}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="issue_priority">Priority</Label>

                                <select
                                    id="issue_priority"
                                    value={issueForm.data.priority}
                                    onChange={(event) =>
                                        issueForm.setData(
                                            'priority',
                                            event.target.value,
                                        )
                                    }
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                </select>

                                {issueForm.errors.priority && (
                                    <p className="text-sm text-red-600">
                                        {issueForm.errors.priority}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="issue_description">
                                    Description
                                </Label>

                                <textarea
                                    id="issue_description"
                                    rows={5}
                                    value={issueForm.data.description}
                                    onChange={(event) =>
                                        issueForm.setData(
                                            'description',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Explain the problem and its effect..."
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                />

                                {issueForm.errors.description && (
                                    <p className="text-sm text-red-600">
                                        {issueForm.errors.description}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="issue_photo">Site Photo</Label>

                                <Input
                                    ref={issuePhotoInput}
                                    id="issue_photo"
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.webp"
                                    onChange={(event) =>
                                        issueForm.setData(
                                            'photo',
                                            event.target.files?.[0] ?? null,
                                        )
                                    }
                                />

                                <p className="text-xs text-muted-foreground">
                                    Optional JPG, PNG or WebP image. Maximum 5
                                    MB.
                                </p>

                                {issueForm.errors.photo && (
                                    <p className="text-sm text-red-600">
                                        {issueForm.errors.photo}
                                    </p>
                                )}
                            </div>

                            {issueForm.progress && (
                                <div className="space-y-2">
                                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="h-full bg-primary"
                                            style={{
                                                width: `${issueForm.progress.percentage ?? 0}%`,
                                            }}
                                        />
                                    </div>

                                    <p className="text-center text-xs text-muted-foreground">
                                        {issueForm.progress.percentage ?? 0}%
                                    </p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={issueForm.processing}
                                className="w-full"
                            >
                                {issueForm.processing
                                    ? 'Reporting...'
                                    : 'Report Issue'}
                            </Button>
                        </form>
                    </div>

                    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                        <div className="border-b p-6">
                            <h2 className="text-lg font-semibold">
                                Site Issues
                            </h2>

                            <p className="mt-1 text-sm text-muted-foreground">
                                {drawing.issues.length}{' '}
                                {drawing.issues.length === 1
                                    ? 'issue'
                                    : 'issues'}{' '}
                                linked to this drawing
                            </p>
                        </div>

                        {drawing.issues.length === 0 ? (
                            <div className="p-10 text-center">
                                <p className="font-medium">
                                    No site issues reported
                                </p>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Report an issue when a drawing conflicts
                                    with actual site conditions.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {drawing.issues.map((issue) => (
                                    <article key={issue.id} className="p-6">
                                        <div className="flex flex-col justify-between gap-4 md:flex-row">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="font-mono text-sm font-semibold">
                                                        {issue.issue_number}
                                                    </p>

                                                    <span className="rounded-full border px-2 py-0.5 text-xs capitalize">
                                                        {formatStatus(
                                                            issue.priority,
                                                        )}
                                                    </span>

                                                    <span className="rounded-full border px-2 py-0.5 text-xs capitalize">
                                                        {formatStatus(
                                                            issue.status,
                                                        )}
                                                    </span>
                                                </div>

                                                <h3 className="mt-3 font-semibold">
                                                    {issue.title}
                                                </h3>

                                                <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">
                                                    {issue.description}
                                                </p>

                                                {issue.location && (
                                                    <p className="mt-3 text-sm">
                                                        <span className="font-medium">
                                                            Location:
                                                        </span>{' '}
                                                        {issue.location}
                                                    </p>
                                                )}

                                                {issue.resolution && (
                                                    <div className="mt-4 rounded-lg border bg-muted/30 p-4">
                                                        <p className="text-sm font-medium">
                                                            Resolution
                                                        </p>

                                                        <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">
                                                            {issue.resolution}
                                                        </p>
                                                    </div>
                                                )}

                                                <p className="mt-4 text-xs text-muted-foreground">
                                                    Reported by{' '}
                                                    {issue.reported_by} on{' '}
                                                    {issue.reported_at}
                                                </p>
                                            </div>

                                            <div className="flex shrink-0 flex-wrap gap-2">
                                                {issue.has_photo && (
                                                    <Button
                                                        asChild
                                                        size="sm"
                                                        variant="outline"
                                                    >
                                                        <a
                                                            href={`/projects/${project.id}/drawings/${drawing.id}/issues/${issue.id}/photo`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            View Photo
                                                        </a>
                                                    </Button>
                                                )}

                                                <Button
                                                    asChild
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    <Link
                                                        href={`/projects/${project.id}/drawings/${drawing.id}/issues/${issue.id}/edit`}
                                                    >
                                                        Update Issue
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
