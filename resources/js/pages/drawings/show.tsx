import { Head, Link, router, useForm } from '@inertiajs/react';
import { History, ListChecks, Plus, Maximize2, Minimize2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import FormModal from '@/components/form-modal';

import ApsViewer from '@/components/aps-viewer';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
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
        'not_started' | 'uploading' | 'processing' | 'ready' | 'failed';

    translation_progress: string | null;
    translation_error: string | null;
    translation_requested_at: string | null;
    translation_completed_at: string | null;

    can_view_dwg: boolean;
    aps_urn: string | null;
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

export default function DrawingShow({
    project,
    drawing,
    apsViewer,
}: DrawingShowProps) {
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

    const initialWorkspaceRevision =
        drawing.revisions.find(
            (revision) => revision.can_view_dwg && revision.aps_urn !== null,
        ) ??
        drawing.revisions.find((revision) => revision.can_preview) ??
        null;

    const [previewRevision, setPreviewRevision] = useState<Revision | null>(
        initialWorkspaceRevision &&
            initialWorkspaceRevision.can_view_dwg &&
            initialWorkspaceRevision.aps_urn !== null
            ? null
            : initialWorkspaceRevision,
    );

    const getPreviewUrl = (revisionId: number) => {
        return `/projects/${project.id}/drawings/${drawing.id}/revisions/${revisionId}/preview`;
    };

    const submit = (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        form.post(
            `/projects/${project.id}/drawings/${drawing.id}/revisions`,
            {
                forceFormData: true,
                preserveScroll: true,

                onSuccess: () => {
                    form.reset();

                    if (fileInput.current) {
                        fileInput.current.value = '';
                    }

                    if (
                        tabletRevisionFileInput.current
                    ) {
                        tabletRevisionFileInput.current.value =
                            '';
                    }

                    setRevisionUploadOpen(false);
                },
            },
        );
    };

    const issuePhotoInput = useRef<HTMLInputElement>(null);

    const issueForm = useForm<IssueForm>({
        title: '',
        description: '',
        location: '',
        priority: 'medium',
        photo: null,
    });

    const submitIssue = (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        issueForm.post(
            `/projects/${project.id}/drawings/${drawing.id}/issues`,
            {
                forceFormData: true,
                preserveScroll: true,

                onSuccess: () => {
                    issueForm.reset();

                    if (issuePhotoInput.current) {
                        issuePhotoInput.current.value =
                            '';
                    }

                    if (
                        tabletIssuePhotoInput.current
                    ) {
                        tabletIssuePhotoInput.current.value =
                            '';
                    }

                    setIssueReportOpen(false);
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

    const [processingRevisionId, setProcessingRevisionId] = useState<
        number | null
    >(null);

    const [apsError, setApsError] = useState<string | null>(null);

    const processDwg = (revision: Revision) => {
        setApsError(null);

        router.post(
            `/projects/${project.id}/drawings/${drawing.id}/revisions/${revision.id}/aps/process`,
            {},
            {
                preserveScroll: true,

                onStart: () => {
                    setProcessingRevisionId(revision.id);
                },

                onError: (errors) => {
                    setApsError(
                        errors.aps ?? 'The DWG could not be processed.',
                    );
                },

                onFinish: () => {
                    setProcessingRevisionId(null);
                },
            },
        );
    };

    const refreshDwgStatus = (revision: Revision) => {
        setApsError(null);

        router.patch(
            `/projects/${project.id}/drawings/${drawing.id}/revisions/${revision.id}/aps/status`,
            {},
            {
                preserveScroll: true,

                onStart: () => {
                    setProcessingRevisionId(revision.id);
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

    const [dwgPreviewRevision, setDwgPreviewRevision] =
        useState<Revision | null>(
            initialWorkspaceRevision &&
                initialWorkspaceRevision.can_view_dwg &&
                initialWorkspaceRevision.aps_urn !== null
                ? initialWorkspaceRevision
                : null,
        );

    const [photoPreviewIssue, setPhotoPreviewIssue] =
        useState<SiteIssue | null>(null);

    const getIssuePhotoUrl = (issueId: number): string => {
        return `/projects/${project.id}/drawings/${drawing.id}/issues/${issueId}/photo`;
    };

    type WorkspaceTab = 'details' | 'revisions' | 'issues';

    const workspaceRef = useRef<HTMLElement>(null);

    const [activeWorkspaceTab, setActiveWorkspaceTab] =
        useState<WorkspaceTab>('details');

    const [isWorkspaceFullscreen, setIsWorkspaceFullscreen] = useState(false);

    const [isFocusMode, setIsFocusMode] = useState(false);

    const previewableRevisions = drawing.revisions.filter(
        (revision) =>
            revision.can_preview ||
            (revision.can_view_dwg && revision.aps_urn !== null),
    );

    const selectedWorkspaceRevision = dwgPreviewRevision ?? previewRevision;

    const selectedWorkspaceRevisionId = selectedWorkspaceRevision?.id ?? '';

    const unresolvedIssueCount = drawing.issues.filter(
        (issue) => issue.status === 'open' || issue.status === 'in_progress',
    ).length;

    const workspaceExpanded = isWorkspaceFullscreen || isFocusMode;

    const selectWorkspaceRevision = (revisionId: number) => {
        const revision = drawing.revisions.find(
            (item) => item.id === revisionId,
        );

        if (!revision) {
            return;
        }

        if (revision.can_view_dwg && revision.aps_urn) {
            setDwgPreviewRevision(revision);
            setPreviewRevision(null);

            return;
        }

        if (revision.can_preview) {
            setPreviewRevision(revision);
            setDwgPreviewRevision(null);
        }
    };

    useEffect(() => {
        if (!photoPreviewIssue) {
            return;
        }

        const previousOverflow = document.body.style.overflow;

        const closeWithEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setPhotoPreviewIssue(null);
            }
        };

        document.body.style.overflow = 'hidden';

        document.addEventListener('keydown', closeWithEscape);

        return () => {
            document.body.style.overflow = previousOverflow;

            document.removeEventListener('keydown', closeWithEscape);
        };
    }, [photoPreviewIssue]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFullscreen =
                document.fullscreenElement === workspaceRef.current;

            setIsWorkspaceFullscreen(isFullscreen);

            window.setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
            }, 150);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener(
                'fullscreenchange',
                handleFullscreenChange,
            );
        };
    }, []);

    useEffect(() => {
        if (!isFocusMode) {
            return;
        }

        const previousOverflow = document.body.style.overflow;

        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isFocusMode]);

    const enterWorkspaceFullscreen = async () => {
        const workspace = workspaceRef.current;

        if (!workspace) {
            return;
        }

        try {
            if (document.fullscreenEnabled && workspace.requestFullscreen) {
                await workspace.requestFullscreen();

                return;
            }
        } catch (error) {
            console.warn('Browser fullscreen was unavailable.', error);
        }

        /*
         * Fallback for browsers or embedded situations
         * where the Fullscreen API is unavailable.
         */
        setIsFocusMode(true);
    };

    const exitWorkspaceFullscreen = async () => {
        if (document.fullscreenElement) {
            await document.exitFullscreen();

            return;
        }

        setIsFocusMode(false);
    };

    type RecordsTab = 'revisions' | 'issues';

    const [
        revisionUploadOpen,
        setRevisionUploadOpen,
    ] = useState(false);

    const [
        issueReportOpen,
        setIssueReportOpen,
    ] = useState(false);

    const [
        recordsModalOpen,
        setRecordsModalOpen,
    ] = useState(false);

    const [
        recordsTab,
        setRecordsTab,
    ] = useState<RecordsTab>('revisions');

    const tabletRevisionFileInput =
        useRef<HTMLInputElement>(null);

    const tabletIssuePhotoInput =
        useRef<HTMLInputElement>(null);


    const openRecordsModal = (
        tab: RecordsTab,
    ) => {
        setRecordsTab(tab);
        setRecordsModalOpen(true);
    };

    const closeRevisionUpload = () => {
        if (form.processing) {
            return;
        }

        form.reset();
        form.clearErrors();

        if (tabletRevisionFileInput.current) {
            tabletRevisionFileInput.current.value = '';
        }

        setRevisionUploadOpen(false);
    };

    const closeIssueReport = () => {
        if (issueForm.processing) {
            return;
        }

        issueForm.reset();
        issueForm.clearErrors();

        if (tabletIssuePhotoInput.current) {
            tabletIssuePhotoInput.current.value = '';
        }

        setIssueReportOpen(false);
    };

    const viewRevisionFromHistory = (
        revision: Revision,
    ) => {
        selectWorkspaceRevision(revision.id);
        setRecordsModalOpen(false);

        window.setTimeout(() => {
            workspaceRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 0);
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

                <section
                    ref={workspaceRef}
                    className={cn(
                        'overflow-hidden rounded-xl border bg-card shadow-sm',
                        workspaceExpanded &&
                            'fixed inset-0 z-[100] grid h-[100dvh] w-screen grid-rows-[auto_minmax(0,1fr)] rounded-none border-0 bg-background',
                    )}
                >
                    <div className="flex flex-col gap-4 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-sm font-semibold">
                                    {drawing.drawing_number}
                                </span>

                                <span className="rounded-full border px-2.5 py-1 text-xs capitalize">
                                    {formatStatus(drawing.status)}
                                </span>

                                {drawing.discipline && (
                                    <span className="rounded-full border px-2.5 py-1 text-xs">
                                        {drawing.discipline}
                                    </span>
                                )}
                            </div>

                            <h2 className="mt-2 truncate text-lg font-semibold">
                                {drawing.title}
                            </h2>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="min-w-0 sm:w-72">
                                <label
                                    htmlFor="workspace_revision"
                                    className="sr-only"
                                >
                                    Select drawing revision
                                </label>

                                <select
                                    id="workspace_revision"
                                    value={selectedWorkspaceRevisionId}
                                    onChange={(event) =>
                                        selectWorkspaceRevision(
                                            Number(event.target.value),
                                        )
                                    }
                                    disabled={previewableRevisions.length === 0}
                                    className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                >
                                    {previewableRevisions.length === 0 && (
                                        <option value="">
                                            No preview available
                                        </option>
                                    )}

                                    {previewableRevisions.map(
                                        (revision, index) => (
                                            <option
                                                key={revision.id}
                                                value={revision.id}
                                            >
                                                Rev {revision.revision_code} —{' '}
                                                {revision.file_extension?.toUpperCase()}
                                                {index === 0
                                                    ? ' (Latest viewable)'
                                                    : ''}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </div>

                            {previewRevision && (
                                <Button
                                    asChild
                                    type="button"
                                    variant="outline"
                                    className="h-11"
                                >
                                    <a
                                        href={getPreviewUrl(previewRevision.id)}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Open Full PDF
                                    </a>
                                </Button>
                            )}

                            <Button
                                type="button"
                                variant="outline"
                                className="h-11 gap-2"
                                onClick={
                                    workspaceExpanded
                                        ? exitWorkspaceFullscreen
                                        : enterWorkspaceFullscreen
                                }
                            >
                                {workspaceExpanded ? (
                                    <>
                                        <Minimize2 className="size-4" />
                                        Exit Full Screen
                                    </>
                                ) : (
                                    <>
                                        <Maximize2 className="size-4" />
                                        Full Screen
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    <div
                        className={
                            workspaceExpanded
                                ? 'relative min-h-0 overflow-hidden'
                                : 'grid min-h-0 gap-4 p-2 sm:p-4 xl:grid-cols-[minmax(0,1fr)_360px]'
                        }
                    >
                        <div
                            className={
                                workspaceExpanded
                                    ? 'absolute inset-0 overflow-hidden bg-neutral-950'
                                    : 'min-h-0 min-w-0 overflow-hidden rounded-lg border bg-neutral-950'
                            }
                        >
                            {dwgPreviewRevision?.aps_urn ? (
                                <ApsViewer
                                    key={dwgPreviewRevision.id}
                                    urn={dwgPreviewRevision.aps_urn}
                                    tokenUrl={apsViewer.token_url}
                                    api={apsViewer.api}
                                    className={
                                        workspaceExpanded
                                            ? 'absolute inset-0 h-full min-h-0 w-full rounded-none'
                                            : 'h-[62dvh] min-h-[460px] rounded-lg md:h-[68dvh]'
                                    }
                                />
                            ) : previewRevision ? (
                                <iframe
                                    key={previewRevision.id}
                                    src={getPreviewUrl(previewRevision.id)}
                                    title={`PDF preview for revision ${previewRevision.revision_code}`}
                                    className={
                                        workspaceExpanded
                                            ? 'absolute inset-0 h-full min-h-0 w-full border-0 bg-white'
                                            : 'h-[62dvh] min-h-[460px] w-full border-0 bg-white md:h-[68dvh]'
                                    }
                                />
                            ) : (
                                <div className="flex h-[62dvh] min-h-[460px] items-center justify-center p-6 text-center text-white">
                                    <div>
                                        <p className="font-medium">
                                            No drawing preview available
                                        </p>

                                        <p className="mt-2 max-w-md text-sm text-neutral-400">
                                            Upload a PDF or process a DWG
                                            revision to display it here.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {!workspaceExpanded && (
                            <aside className="overflow-hidden rounded-lg border bg-background">
                                <div
                                    className="grid grid-cols-3 border-b"
                                    role="tablist"
                                    aria-label="Drawing information"
                                >
                                    {(
                                        [
                                            ['details', 'Details'],
                                            ['revisions', 'Revisions'],
                                            [
                                                'issues',
                                                `Issues (${unresolvedIssueCount})`,
                                            ],
                                        ] as const
                                    ).map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            role="tab"
                                            aria-selected={
                                                activeWorkspaceTab === value
                                            }
                                            onClick={() =>
                                                setActiveWorkspaceTab(value)
                                            }
                                            className={cn(
                                                'min-h-12 border-b-2 px-2 text-sm font-medium',
                                                activeWorkspaceTab === value
                                                    ? 'border-primary text-foreground'
                                                    : 'border-transparent text-muted-foreground hover:text-foreground',
                                            )}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>

                                <div className="max-h-[68dvh] overflow-y-auto p-5">
                                    {activeWorkspaceTab === 'details' && (
                                        <div className="space-y-5">
                                            <div>
                                                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                    Drawing
                                                </p>

                                                <p className="mt-1 font-mono font-semibold">
                                                    {drawing.drawing_number}
                                                </p>

                                                <p className="mt-1 text-sm">
                                                    {drawing.title}
                                                </p>
                                            </div>

                                            <dl className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <dt className="text-muted-foreground">
                                                        Discipline
                                                    </dt>
                                                    <dd className="mt-1 font-medium">
                                                        {drawing.discipline ??
                                                            'Not set'}
                                                    </dd>
                                                </div>

                                                <div>
                                                    <dt className="text-muted-foreground">
                                                        Status
                                                    </dt>
                                                    <dd className="mt-1 font-medium capitalize">
                                                        {formatStatus(
                                                            drawing.status,
                                                        )}
                                                    </dd>
                                                </div>

                                                <div>
                                                    <dt className="text-muted-foreground">
                                                        Revisions
                                                    </dt>
                                                    <dd className="mt-1 font-medium">
                                                        {
                                                            drawing.revisions
                                                                .length
                                                        }
                                                    </dd>
                                                </div>

                                                <div>
                                                    <dt className="text-muted-foreground">
                                                        Open issues
                                                    </dt>
                                                    <dd className="mt-1 font-medium">
                                                        {unresolvedIssueCount}
                                                    </dd>
                                                </div>
                                            </dl>

                                            {drawing.description && (
                                                <div>
                                                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                        Description
                                                    </p>

                                                    <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">
                                                        {drawing.description}
                                                    </p>
                                                </div>
                                            )}

                                            <p className="text-xs text-muted-foreground">
                                                Registered by{' '}
                                                {drawing.creator_name}
                                            </p>
                                        </div>
                                    )}

                                    {activeWorkspaceTab === 'revisions' && (
                                        <div className="space-y-3">
                                            <div className="mb-5 grid grid-cols-2 gap-3 xl:hidden">
                                                <Button
                                                    type="button"
                                                    className="h-11 gap-2"
                                                    onClick={() =>
                                                        setRevisionUploadOpen(true)
                                                    }
                                                >
                                                    <Plus className="size-4" />
                                                    Upload Revision
                                                </Button>

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="h-11 gap-2"
                                                    onClick={() =>
                                                        openRecordsModal('revisions')
                                                    }
                                                >
                                                    <History className="size-4" />
                                                    Full History
                                                </Button>
                                            </div>

                                            {drawing.revisions.map(
                                                (revision, index) => (
                                                    <div
                                                        key={revision.id}
                                                        className={cn(
                                                            'rounded-lg border p-4',
                                                            selectedWorkspaceRevision?.id ===
                                                                revision.id &&
                                                                'border-primary bg-primary/5',
                                                            index >= 3 && 'max-xl:hidden',
                                                        )}
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="font-mono font-semibold">
                                                                    Rev{' '}
                                                                    {
                                                                        revision.revision_code
                                                                    }
                                                                </p>

                                                                <p className="mt-1 truncate text-sm">
                                                                    {
                                                                        revision.original_filename
                                                                    }
                                                                </p>

                                                                <p className="mt-1 text-xs text-muted-foreground uppercase">
                                                                    {revision.file_extension ??
                                                                        'File'}{' '}
                                                                    ·{' '}
                                                                    {formatFileSize(
                                                                        revision.file_size,
                                                                    )}
                                                                </p>
                                                            </div>

                                                            {(revision.can_preview ||
                                                                revision.can_view_dwg) && (
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        selectWorkspaceRevision(
                                                                            revision.id,
                                                                        )
                                                                    }
                                                                >
                                                                    View
                                                                </Button>
                                                            )}
                                                        </div>

                                                        {revision.revision_notes && (
                                                            <p className="mt-3 text-sm text-muted-foreground">
                                                                {
                                                                    revision.revision_notes
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                ),
                                            )}

                                            {drawing.revisions.length > 3 && (
                                                <p className="mt-3 text-center text-xs text-muted-foreground xl:hidden">
                                                    Showing the latest 3 of{' '}
                                                    {drawing.revisions.length} revisions.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {activeWorkspaceTab === 'issues' && (
                                        <div className="space-y-3">
                                            <div className="mb-5 grid grid-cols-2 gap-3 xl:hidden">
                                                <Button
                                                    type="button"
                                                    className="h-11 gap-2"
                                                    onClick={() =>
                                                        setIssueReportOpen(true)
                                                    }
                                                >
                                                    <Plus className="size-4" />
                                                    Report Issue
                                                </Button>

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="h-11 gap-2"
                                                    onClick={() =>
                                                        openRecordsModal('issues')
                                                    }
                                                >
                                                    <ListChecks className="size-4" />
                                                    All Issues
                                                </Button>
                                            </div>

                                            {drawing.issues.length === 0 ? (
                                                <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                                                    No site issues are linked to
                                                    this drawing.
                                                </p>
                                            ) : (
                                                drawing.issues.map((issue, index) => (
                                                    <div
                                                        key={issue.id}
                                                        className={cn(
                                                            'rounded-lg border p-4',
                                                            index >= 3 && 'max-xl:hidden',
                                                        )}
                                                    >
                                                        <div className="flex flex-wrap gap-2">
                                                            <span className="font-mono text-xs font-semibold">
                                                                {
                                                                    issue.issue_number
                                                                }
                                                            </span>

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

                                                        <p className="mt-3 text-sm font-medium">
                                                            {issue.title}
                                                        </p>

                                                        {issue.location && (
                                                            <p className="mt-2 text-xs text-muted-foreground">
                                                                {issue.location}
                                                            </p>
                                                        )}

                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {issue.has_photo && (
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() =>
                                                                        setPhotoPreviewIssue(
                                                                            issue,
                                                                        )
                                                                    }
                                                                >
                                                                    View Photo
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            )}

                                            {drawing.issues.length > 3 && (
                                                <p className="mt-3 text-center text-xs text-muted-foreground xl:hidden">
                                                    Showing the latest 3 of{' '}
                                                    {drawing.issues.length} site issues.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </aside>
                        )}
                    </div>
                </section>

                <div className="hidden gap-6 xl:grid xl:grid-cols-[380px_1fr]">
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
                                                                    setPreviewRevision(
                                                                        revision,
                                                                    );
                                                                    setDwgPreviewRevision(
                                                                        null,
                                                                    );

                                                                    window.setTimeout(
                                                                        () => {
                                                                            document
                                                                                .getElementById(
                                                                                    'pdf-preview',
                                                                                )
                                                                                ?.scrollIntoView(
                                                                                    {
                                                                                        behavior:
                                                                                            'smooth',
                                                                                        block: 'start',
                                                                                    },
                                                                                );
                                                                        },
                                                                        0,
                                                                    );
                                                                }}
                                                            >
                                                                {previewRevision?.id ===
                                                                revision.id
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
                                                                        processDwg(
                                                                            revision,
                                                                        )
                                                                    }
                                                                >
                                                                    {processingRevisionId ===
                                                                    revision.id
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
                                                                        refreshDwgStatus(
                                                                            revision,
                                                                        )
                                                                    }
                                                                >
                                                                    {processingRevisionId ===
                                                                    revision.id
                                                                        ? 'Checking...'
                                                                        : 'Refresh Status'}
                                                                </Button>
                                                            )}

                                                        {revision.file_extension?.toLowerCase() ===
                                                            'dwg' &&
                                                            revision.translation_status ===
                                                                'ready' &&
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

                                                                        setPreviewRevision(
                                                                            null,
                                                                        );

                                                                        window.setTimeout(
                                                                            () => {
                                                                                document
                                                                                    .getElementById(
                                                                                        'dwg-preview',
                                                                                    )
                                                                                    ?.scrollIntoView(
                                                                                        {
                                                                                            behavior:
                                                                                                'smooth',
                                                                                            block: 'start',
                                                                                        },
                                                                                    );
                                                                            },
                                                                            0,
                                                                        );
                                                                    }}
                                                                >
                                                                    {dwgPreviewRevision?.id ===
                                                                    revision.id
                                                                        ? 'Viewing DWG'
                                                                        : 'Preview DWG'}
                                                                </Button>
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

                <section className="hidden gap-6 xl:grid xl:grid-cols-[380px_1fr]">
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
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(event) =>
                                        issueForm.setData(
                                            'photo',
                                            event.target.files?.[0] ?? null,
                                        )
                                    }
                                />

                                <p className="text-xs text-muted-foreground">
                                    Take Photo, Photo Library, or Choose File. Maximum 5 MB.
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
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            setPhotoPreviewIssue(
                                                                issue,
                                                            )
                                                        }
                                                    >
                                                        View Photo
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

            <FormModal
                open={revisionUploadOpen}
                title="Upload Revision"
                description={`Add a revision to ${drawing.drawing_number} — ${drawing.title}.`}
                onClose={closeRevisionUpload}
            >
                <form
                    onSubmit={submit}
                    className="space-y-5"
                >
                    <div className="space-y-2">
                        <Label htmlFor="tablet_revision_code">
                            Revision Code
                        </Label>

                        <Input
                            id="tablet_revision_code"
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
                        <Label htmlFor="tablet_issued_at">
                            Issue Date
                        </Label>

                        <Input
                            id="tablet_issued_at"
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
                        <Label htmlFor="tablet_revision_file">
                            Revision File
                        </Label>

                        <Input
                            ref={tabletRevisionFileInput}
                            id="tablet_revision_file"
                            type="file"
                            accept=".pdf,.dwg,.dxf"
                            onChange={(event) =>
                                form.setData(
                                    'file',
                                    event.target.files?.[0] ??
                                        null,
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
                        <Label htmlFor="tablet_revision_notes">
                            Revision Notes
                        </Label>

                        <textarea
                            id="tablet_revision_notes"
                            rows={5}
                            value={form.data.revision_notes}
                            onChange={(event) =>
                                form.setData(
                                    'revision_notes',
                                    event.target.value,
                                )
                            }
                            placeholder="Describe what changed..."
                            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none"
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
                                    className="h-full bg-primary"
                                    style={{
                                        width: `${form.progress.percentage ?? 0}%`,
                                    }}
                                />
                            </div>

                            <p className="text-center text-xs text-muted-foreground">
                                {form.progress.percentage ?? 0}%
                            </p>
                        </div>
                    )}

                    <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={form.processing}
                            onClick={closeRevisionUpload}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            disabled={form.processing}
                        >
                            {form.processing
                                ? 'Uploading...'
                                : 'Upload Revision'}
                        </Button>
                    </div>
                </form>
            </FormModal>

            <FormModal
                open={issueReportOpen}
                title="Report Site Issue"
                description={`Link a site problem to drawing ${drawing.drawing_number}.`}
                onClose={closeIssueReport}
            >
                <form
                    onSubmit={submitIssue}
                    className="space-y-5"
                >
                    <div className="space-y-2">
                        <Label htmlFor="tablet_issue_title">
                            Issue Title
                        </Label>

                        <Input
                            id="tablet_issue_title"
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
                        <Label htmlFor="tablet_issue_location">
                            Site Location
                        </Label>

                        <Input
                            id="tablet_issue_location"
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
                        <Label htmlFor="tablet_issue_priority">
                            Priority
                        </Label>

                        <select
                            id="tablet_issue_priority"
                            value={issueForm.data.priority}
                            onChange={(event) =>
                                issueForm.setData(
                                    'priority',
                                    event.target.value,
                                )
                            }
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">
                                Critical
                            </option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tablet_issue_description">
                            Description
                        </Label>

                        <textarea
                            id="tablet_issue_description"
                            rows={5}
                            value={issueForm.data.description}
                            onChange={(event) =>
                                issueForm.setData(
                                    'description',
                                    event.target.value,
                                )
                            }
                            placeholder="Explain the problem..."
                            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none"
                        />

                        {issueForm.errors.description && (
                            <p className="text-sm text-red-600">
                                {issueForm.errors.description}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="tablet_issue_photo">
                            Site Photo
                        </Label>

                        <Input
                            ref={tabletIssuePhotoInput}
                            id="tablet_issue_photo"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(event) =>
                                issueForm.setData(
                                    'photo',
                                    event.target.files?.[0] ??
                                        null,
                                )
                            }
                        />

                        <p className="text-xs text-muted-foreground">
                            Choose the camera, Photo Library, or
                            Files. Maximum 5 MB.
                        </p>

                        {issueForm.errors.photo && (
                            <p className="text-sm text-red-600">
                                {issueForm.errors.photo}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={issueForm.processing}
                            onClick={closeIssueReport}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            disabled={issueForm.processing}
                        >
                            {issueForm.processing
                                ? 'Reporting...'
                                : 'Report Issue'}
                        </Button>
                    </div>
                </form>
            </FormModal>

            <FormModal
                open={recordsModalOpen}
                title="Drawing Records"
                description={`${drawing.drawing_number} — revisions and linked site issues.`}
                onClose={() =>
                    setRecordsModalOpen(false)
                }
                panelClassName="max-w-5xl"
            >
                <div className="grid grid-cols-2 border-b">
                    <button
                        type="button"
                        onClick={() =>
                            setRecordsTab('revisions')
                        }
                        className={cn(
                            'min-h-12 border-b-2 px-4 text-sm font-medium',
                            recordsTab === 'revisions'
                                ? 'border-primary'
                                : 'border-transparent text-muted-foreground',
                        )}
                    >
                        Revision History (
                        {drawing.revisions.length})
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            setRecordsTab('issues')
                        }
                        className={cn(
                            'min-h-12 border-b-2 px-4 text-sm font-medium',
                            recordsTab === 'issues'
                                ? 'border-primary'
                                : 'border-transparent text-muted-foreground',
                        )}
                    >
                        Site Issues ({drawing.issues.length})
                    </button>
                </div>

                {recordsTab === 'revisions' ? (
                    <div className="mt-5 space-y-4">
                        {drawing.revisions.length === 0 ? (
                            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                                No revisions uploaded.
                            </p>
                        ) : (
                            drawing.revisions.map((revision) => (
                                <article
                                    key={revision.id}
                                    className="rounded-xl border p-4"
                                >
                                    <div className="flex flex-col justify-between gap-4 sm:flex-row">
                                        <div className="min-w-0">
                                            <p className="font-mono font-semibold">
                                                Revision{' '}
                                                {
                                                    revision.revision_code
                                                }
                                            </p>

                                            <p className="mt-1 break-all text-sm">
                                                {
                                                    revision.original_filename
                                                }
                                            </p>

                                            <p className="mt-1 text-xs uppercase text-muted-foreground">
                                                {revision.file_extension ??
                                                    'File'}{' '}
                                                ·{' '}
                                                {formatFileSize(
                                                    revision.file_size,
                                                )}
                                            </p>

                                            {revision.revision_notes && (
                                                <p className="mt-3 text-sm text-muted-foreground">
                                                    {
                                                        revision.revision_notes
                                                    }
                                                </p>
                                            )}

                                            <p className="mt-3 text-xs text-muted-foreground">
                                                Uploaded by{' '}
                                                {revision.uploaded_by} on{' '}
                                                {revision.uploaded_at}
                                            </p>
                                        </div>

                                        <div className="flex shrink-0 flex-wrap gap-2">
                                            {(revision.can_preview ||
                                                revision.can_view_dwg) && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={() =>
                                                        viewRevisionFromHistory(
                                                            revision,
                                                        )
                                                    }
                                                >
                                                    View
                                                </Button>
                                            )}

                                            <Button
                                                asChild
                                                size="sm"
                                                variant="outline"
                                            >
                                                <a
                                                    href={`/projects/${project.id}/drawings/${drawing.id}/revisions/${revision.id}/download`}
                                                >
                                                    Download
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                </article>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="mt-5 space-y-4">
                        {drawing.issues.length === 0 ? (
                            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                                No site issues reported.
                            </p>
                        ) : (
                            drawing.issues.map((issue) => (
                                <article
                                    key={issue.id}
                                    className="rounded-xl border p-4"
                                >
                                    <div className="flex flex-col justify-between gap-4 sm:flex-row">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap gap-2">
                                                <span className="font-mono text-sm font-semibold">
                                                    {
                                                        issue.issue_number
                                                    }
                                                </span>

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

                                            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                                                {issue.description}
                                            </p>

                                            {issue.location && (
                                                <p className="mt-3 text-sm">
                                                    Location:{' '}
                                                    {issue.location}
                                                </p>
                                            )}

                                            {issue.resolution && (
                                                <div className="mt-4 rounded-lg bg-muted/40 p-4">
                                                    <p className="text-sm font-medium">
                                                        Resolution
                                                    </p>

                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        {
                                                            issue.resolution
                                                        }
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex shrink-0 flex-wrap gap-2">
                                            {issue.has_photo && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        setPhotoPreviewIssue(
                                                            issue,
                                                        )
                                                    }
                                                >
                                                    View Photo
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
                                                    Update
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                </article>
                            ))
                        )}
                    </div>
                )}
            </FormModal>

            {photoPreviewIssue && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Photo for ${
                        photoPreviewIssue.issue_number ?? 'site issue'
                    }`}
                    className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 p-2 sm:p-6"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setPhotoPreviewIssue(null);
                        }
                    }}
                >
                    <div className="flex max-h-[96dvh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl">
                        <div className="flex items-center justify-between gap-4 border-b p-4">
                            <div className="min-w-0">
                                <p className="font-mono text-sm font-semibold">
                                    {photoPreviewIssue.issue_number ??
                                        'Site Issue'}
                                </p>

                                <h2 className="mt-1 truncate font-semibold">
                                    {photoPreviewIssue.title}
                                </h2>

                                {photoPreviewIssue.location && (
                                    <p className="mt-1 truncate text-xs text-muted-foreground">
                                        {photoPreviewIssue.location}
                                    </p>
                                )}
                            </div>

                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label="Close photo preview"
                                onClick={() => setPhotoPreviewIssue(null)}
                            >
                                <X className="size-5" />
                            </Button>
                        </div>

                        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-neutral-950 p-2 sm:p-4">
                            <img
                                src={getIssuePhotoUrl(photoPreviewIssue.id)}
                                alt={`Site issue: ${photoPreviewIssue.title}`}
                                className="max-h-[78dvh] max-w-full object-contain"
                            />
                        </div>

                        <div className="flex flex-wrap justify-end gap-2 border-t p-4">
                            <Button asChild variant="outline">
                                <a
                                    href={getIssuePhotoUrl(
                                        photoPreviewIssue.id,
                                    )}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Open Original
                                </a>
                            </Button>

                            <Button
                                type="button"
                                onClick={() => setPhotoPreviewIssue(null)}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
