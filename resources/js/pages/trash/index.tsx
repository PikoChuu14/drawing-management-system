import { Head, router } from '@inertiajs/react';

import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type DeletedProject = {
    id: number;
    project_code: string;
    name: string;
    deleted_at: string | null;
};

type DeletedDrawing = {
    id: number;
    drawing_number: string;
    title: string;
    project_code: string;
    project_name: string;
    project_deleted: boolean;
    deleted_at: string | null;
};

type TrashProps = {
    projects: DeletedProject[];
    drawings: DeletedDrawing[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Trash',
        href: '/trash',
    },
];

const permanentlyDeleteProject = (
    project: DeletedProject,
) => {
    const confirmed = window.confirm(
        `Permanently delete ${project.project_code} — ${project.name}?\n\n`
            + 'This will permanently remove:\n'
            + '• The project\n'
            + '• All drawings\n'
            + '• All revisions\n'
            + '• Uploaded drawing files\n'
            + '• Autodesk APS files\n'
            + '• Site issues and photos\n\n'
            + 'This action cannot be undone.',
    );

    if (!confirmed) {
        return;
    }

    router.delete(
        `/trash/projects/${project.id}/permanent`,
        {
            preserveScroll: true,
        },
    );
};

const permanentlyDeleteDrawing = (
    drawing: DeletedDrawing,
) => {
    const confirmed = window.confirm(
        `Permanently delete ${drawing.drawing_number} — ${drawing.title}?\n\n`
            + 'This will permanently remove:\n'
            + '• The drawing\n'
            + '• All revisions\n'
            + '• Uploaded drawing files\n'
            + '• Autodesk APS files\n'
            + '• Site issues and photos\n\n'
            + 'This action cannot be undone.',
    );

    if (!confirmed) {
        return;
    }

    router.delete(
        `/trash/drawings/${drawing.id}/permanent`,
        {
            preserveScroll: true,
        },
    );
};

export default function Trash({ projects, drawings }: TrashProps) {
    const restoreProject = (projectId: number) => {
        router.patch(
            `/trash/projects/${projectId}/restore`,
            {},
            {
                preserveScroll: true,
            },
        );
    };

    const restoreDrawing = (drawingId: number) => {
        router.patch(
            `/trash/drawings/${drawingId}/restore`,
            {},
            {
                preserveScroll: true,
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Trash" />

            <div className="flex flex-1 flex-col gap-6 px-3 py-4 sm:p-6">
                <header>
                    <h1 className="text-2xl font-semibold">Deleted Items</h1>

                    <p className="mt-1 hidden text-sm text-muted-foreground sm:block">
                        Restore projects and drawings that were deleted
                        accidentally.
                    </p>
                </header>

                <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                    <div className="border-b p-6">
                        <h2 className="text-lg font-semibold">
                            Deleted Projects
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            {projects.length} deleted{' '}
                            {projects.length === 1 ? 'project' : 'projects'}
                        </p>
                    </div>

                    {projects.length === 0 ? (
                        <p className="p-10 text-center text-sm text-muted-foreground">
                            No deleted projects.
                        </p>
                    ) : (
                        <>
                            <div className="divide-y xl:hidden">
                                {projects.map((project) => (
                                    <article
                                        key={project.id}
                                        className="p-5 sm:p-6"
                                    >
                                        <p className="font-mono text-sm text-muted-foreground">
                                            {project.project_code}
                                        </p>

                                        <h3 className="mt-1 text-lg font-semibold">
                                            {project.name}
                                        </h3>

                                        <p className="mt-3 text-sm text-muted-foreground">
                                            Deleted{' '}
                                            {project.deleted_at ?? 'Unknown'}
                                        </p>

                                        <div className="mt-5 flex flex-wrap gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-11 flex-1"
                                                onClick={() =>
                                                    restoreProject(project.id)
                                                }
                                            >
                                                Restore Project
                                            </Button>

                                            <Button
                                                type="button"
                                                variant="destructive"
                                                className="h-11 flex-1"
                                                onClick={() =>
                                                    permanentlyDeleteProject(project)
                                                }
                                            >
                                                Permanently Delete
                                            </Button>
                                        </div>
                                    </article>
                                ))}
                            </div>

                            <div className="hidden overflow-x-auto xl:block">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b bg-muted/50">
                                        <tr>
                                            <th className="px-6 py-3">Code</th>
                                            <th className="px-6 py-3">
                                                Project
                                            </th>
                                            <th className="px-6 py-3">
                                                Deleted
                                            </th>
                                            <th className="w-[280px] px-6 py-4 text-left">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {projects.map((project) => (
                                            <tr
                                                key={project.id}
                                                className="border-b last:border-0"
                                            >
                                                <td className="px-6 py-4 font-mono">
                                                    {project.project_code}
                                                </td>

                                                <td className="px-6 py-4 font-medium">
                                                    {project.name}
                                                </td>

                                                <td className="px-6 py-4 text-muted-foreground">
                                                    {project.deleted_at}
                                                </td>

                                                <td className="w-[280px] px-6 py-4">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            onClick={() =>
                                                                restoreProject(project.id)
                                                            }
                                                        >
                                                            Restore
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            onClick={() =>
                                                                permanentlyDeleteProject(project)
                                                            }
                                                        >
                                                            Permanently Delete
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </section>

                <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                    <div className="border-b p-6">
                        <h2 className="text-lg font-semibold">
                            Deleted Drawings
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            {drawings.length} deleted{' '}
                            {drawings.length === 1 ? 'drawing' : 'drawings'}
                        </p>
                    </div>

                    {drawings.length === 0 ? (
                        <p className="p-10 text-center text-sm text-muted-foreground">
                            No deleted drawings.
                        </p>
                    ) : (
                        <>
                            <div className="divide-y xl:hidden">
                                {drawings.map((drawing) => (
                                    <article
                                        key={drawing.id}
                                        className="p-5 sm:p-6"
                                    >
                                        <p className="font-mono text-sm text-muted-foreground">
                                            {drawing.drawing_number}
                                        </p>

                                        <h3 className="mt-1 text-lg font-semibold">
                                            {drawing.title}
                                        </h3>

                                        <div className="mt-4 rounded-lg bg-muted/40 p-4 text-sm">
                                            <p className="font-medium">
                                                {drawing.project_name}
                                            </p>

                                            <p className="mt-1 font-mono text-xs text-muted-foreground">
                                                {drawing.project_code}
                                            </p>
                                        </div>

                                        <p className="mt-4 text-sm text-muted-foreground">
                                            Deleted{' '}
                                            {drawing.deleted_at ?? 'Unknown'}
                                        </p>

                                        <div className="mt-5 flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-11 flex-1"
                                                disabled={drawing.project_deleted}
                                                onClick={() =>
                                                    restoreDrawing(drawing.id)
                                                }
                                            >
                                                {drawing.project_deleted
                                                    ? 'Restore Parent First'
                                                    : 'Restore'}
                                            </Button>

                                            <Button
                                                type="button"
                                                variant="destructive"
                                                className="h-11 flex-1"
                                                onClick={() =>
                                                    permanentlyDeleteDrawing(
                                                        drawing,
                                                    )
                                                }
                                            >
                                                Permanently Delete
                                            </Button>
                                        </div>
                                    </article>
                                ))}
                            </div>

                            <div className="hidden overflow-x-auto xl:block">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b bg-muted/50">
                                        <tr>
                                            <th className="px-6 py-3">
                                                Number
                                            </th>
                                            <th className="px-6 py-3">
                                                Drawing
                                            </th>
                                            <th className="px-6 py-3">
                                                Project
                                            </th>
                                            <th className="px-6 py-3">
                                                Deleted
                                            </th>
                                            <th className="w-[300px] px-6 py-3">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {drawings.map((drawing) => (
                                            <tr
                                                key={drawing.id}
                                                className="border-b last:border-0"
                                            >
                                                <td className="px-6 py-4 font-mono">
                                                    {drawing.drawing_number}
                                                </td>

                                                <td className="px-6 py-4 font-medium">
                                                    {drawing.title}
                                                </td>

                                                <td className="px-6 py-4">
                                                    <p>
                                                        {drawing.project_name}
                                                    </p>

                                                    <p className="font-mono text-xs text-muted-foreground">
                                                        {drawing.project_code}
                                                    </p>
                                                </td>

                                                <td className="px-6 py-4 text-muted-foreground">
                                                    {drawing.deleted_at}
                                                </td>

                                                <td className="w-[300px] px-6 py-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            disabled={
                                                                drawing.project_deleted
                                                            }
                                                            onClick={() =>
                                                                restoreDrawing(
                                                                    drawing.id,
                                                                )
                                                            }
                                                        >
                                                            {drawing.project_deleted
                                                                ? 'Restore Parent First'
                                                                : 'Restore'}
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            onClick={() =>
                                                                permanentlyDeleteDrawing(
                                                                    drawing,
                                                                )
                                                            }
                                                        >
                                                            Permanently Delete
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </section>
            </div>
        </AppLayout>
    );
}
