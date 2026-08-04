import { Head, Link } from '@inertiajs/react';
import {
    CheckCircle2,
    FileStack,
    FolderKanban,
    Layers3,
    Plus,
} from 'lucide-react';

import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type DashboardSummary = {
    total_projects: number;
    active_projects: number;
    total_drawings: number;
    approved_drawings: number;
    total_revisions: number;
};

type DrawingStatusCounts = {
    draft: number;
    under_review: number;
    approved: number;
    superseded: number;
};

type RecentProject = {
    id: number;
    project_code: string;
    name: string;
    status: string;
    drawing_count: number;
    created_at: string;
};

type RecentRevision = {
    id: number;
    revision_code: string;
    original_filename: string;
    file_size: number;

    drawing_id: number;
    drawing_number: string;
    drawing_title: string;

    project_id: number;
    project_code: string;
    project_name: string;

    uploaded_by: string;
    uploaded_at: string;
};

type DashboardProps = {
    summary: DashboardSummary;
    drawingStatusCounts: DrawingStatusCounts;
    recentProjects: RecentProject[];
    recentRevisions: RecentRevision[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

function formatStatus(status: string): string {
    return status
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
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

export default function Dashboard({
    summary,
    drawingStatusCounts,
    recentProjects,
    recentRevisions,
}: DashboardProps) {
    const totalStatusDrawings = Object.values(drawingStatusCounts).reduce(
        (total, count) => total + count,
        0,
    );

    const statusItems = [
        {
            key: 'draft',
            label: 'Draft',
            count: drawingStatusCounts.draft,
        },
        {
            key: 'under_review',
            label: 'Under Review',
            count: drawingStatusCounts.under_review,
        },
        {
            key: 'approved',
            label: 'Approved',
            count: drawingStatusCounts.approved,
        },
        {
            key: 'superseded',
            label: 'Superseded',
            count: drawingStatusCounts.superseded,
        },
    ];

    const summaryCards = [
        {
            label: 'Total Projects',
            value: summary.total_projects,
            secondary: `${summary.active_projects} active`,
            icon: FolderKanban,
        },
        {
            label: 'Total Drawings',
            value: summary.total_drawings,
            secondary: `${summary.approved_drawings} approved`,
            icon: FileStack,
        },
        {
            label: 'Uploaded Revisions',
            value: summary.total_revisions,
            secondary: 'All revision files',
            icon: Layers3,
        },
        {
            label: 'Approved Drawings',
            value: summary.approved_drawings,
            secondary:
                summary.total_drawings === 0
                    ? 'No drawings yet'
                    : `${Math.round(
                          (summary.approved_drawings / summary.total_drawings) *
                              100,
                      )}% of drawings`,
            icon: CheckCircle2,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            Drawing Management Dashboard
                        </h1>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Overview of projects, drawings and revision
                            activity.
                        </p>
                    </div>

                    <Link
                        href="/projects"
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90"
                    >
                        <Plus className="size-4" />
                        Manage Projects
                    </Link>
                </header>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {summaryCards.map((card) => {
                        const Icon = card.icon;

                        return (
                            <div
                                key={card.label}
                                className="rounded-xl border bg-card p-5 shadow-sm"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">
                                            {card.label}
                                        </p>

                                        <p className="mt-2 text-3xl font-semibold">
                                            {card.value}
                                        </p>

                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {card.secondary}
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-muted p-3">
                                        <Icon className="size-5" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </section>

                <section className="grid gap-6 xl:grid-cols-[1fr_1.5fr]">
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <div>
                            <h2 className="text-lg font-semibold">
                                Drawing Status
                            </h2>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Current drawing workflow distribution
                            </p>
                        </div>

                        <div className="mt-6 space-y-5">
                            {statusItems.map((status) => {
                                const percentage =
                                    totalStatusDrawings === 0
                                        ? 0
                                        : Math.round(
                                              (status.count /
                                                  totalStatusDrawings) *
                                                  100,
                                          );

                                return (
                                    <div key={status.key}>
                                        <div className="mb-2 flex items-center justify-between text-sm">
                                            <span className="font-medium">
                                                {status.label}
                                            </span>

                                            <span className="text-muted-foreground">
                                                {status.count} ({percentage}%)
                                            </span>
                                        </div>

                                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                                            <div
                                                className="h-full rounded-full bg-primary transition-all"
                                                style={{
                                                    width: `${percentage}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}

                            {totalStatusDrawings === 0 && (
                                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                    Register drawings to see their status
                                    distribution.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                        <div className="flex items-center justify-between border-b p-6">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Recent Projects
                                </h2>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    The latest projects added to the system
                                </p>
                            </div>

                            <Link
                                href="/projects"
                                className="text-sm font-medium hover:underline"
                            >
                                View all
                            </Link>
                        </div>

                        {recentProjects.length === 0 ? (
                            <div className="p-10 text-center">
                                <p className="font-medium">No projects yet</p>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Create a project to begin registering
                                    drawings.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {recentProjects.map((project) => (
                                    <Link
                                        key={project.id}
                                        href={`/projects/${project.id}`}
                                        className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-muted/50"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">
                                                {project.name}
                                            </p>

                                            <p className="mt-1 font-mono text-xs text-muted-foreground">
                                                {project.project_code}
                                            </p>
                                        </div>

                                        <div className="shrink-0 text-right">
                                            <p className="text-sm capitalize">
                                                {formatStatus(project.status)}
                                            </p>

                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {project.drawing_count}{' '}
                                                {project.drawing_count === 1
                                                    ? 'drawing'
                                                    : 'drawings'}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                    <div className="border-b p-6">
                        <h2 className="text-lg font-semibold">
                            Recent Revision Uploads
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Latest drawing files uploaded to the system
                        </p>
                    </div>

                    {recentRevisions.length === 0 ? (
                        <div className="p-10 text-center">
                            <p className="font-medium">No revisions uploaded</p>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Open a drawing and upload its first revision
                                file.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b bg-muted/50">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">
                                            Project
                                        </th>

                                        <th className="px-6 py-3 font-medium">
                                            Drawing
                                        </th>

                                        <th className="px-6 py-3 font-medium">
                                            Revision
                                        </th>

                                        <th className="px-6 py-3 font-medium">
                                            File
                                        </th>

                                        <th className="px-6 py-3 font-medium">
                                            Uploaded
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {recentRevisions.map((revision) => (
                                        <tr
                                            key={revision.id}
                                            className="border-b last:border-b-0"
                                        >
                                            <td className="px-6 py-4">
                                                <Link
                                                    href={`/projects/${revision.project_id}`}
                                                    className="font-medium hover:underline"
                                                >
                                                    {revision.project_name}
                                                </Link>

                                                <p className="mt-1 font-mono text-xs text-muted-foreground">
                                                    {revision.project_code}
                                                </p>
                                            </td>

                                            <td className="px-6 py-4">
                                                <Link
                                                    href={`/projects/${revision.project_id}/drawings/${revision.drawing_id}`}
                                                    className="font-medium hover:underline"
                                                >
                                                    {revision.drawing_title}
                                                </Link>

                                                <p className="mt-1 font-mono text-xs text-muted-foreground">
                                                    {revision.drawing_number}
                                                </p>
                                            </td>

                                            <td className="px-6 py-4 font-mono font-semibold">
                                                {revision.revision_code}
                                            </td>

                                            <td className="px-6 py-4">
                                                <p className="max-w-64 truncate">
                                                    {revision.original_filename}
                                                </p>

                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {formatFileSize(
                                                        revision.file_size,
                                                    )}
                                                </p>
                                            </td>

                                            <td className="px-6 py-4">
                                                <p>{revision.uploaded_by}</p>

                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {revision.uploaded_at}
                                                </p>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </AppLayout>
    );
}
