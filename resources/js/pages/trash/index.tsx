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

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <header>
                    <h1 className="text-2xl font-semibold">Deleted Items</h1>

                    <p className="mt-1 text-sm text-muted-foreground">
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
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b bg-muted/50">
                                    <tr>
                                        <th className="px-6 py-3">Code</th>
                                        <th className="px-6 py-3">Project</th>
                                        <th className="px-6 py-3">Deleted</th>
                                        <th className="px-6 py-3">Action</th>
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

                                            <td className="px-6 py-4">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        restoreProject(
                                                            project.id,
                                                        )
                                                    }
                                                >
                                                    Restore
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b bg-muted/50">
                                    <tr>
                                        <th className="px-6 py-3">Number</th>
                                        <th className="px-6 py-3">Drawing</th>
                                        <th className="px-6 py-3">Project</th>
                                        <th className="px-6 py-3">Deleted</th>
                                        <th className="px-6 py-3">Action</th>
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
                                                <p>{drawing.project_name}</p>

                                                <p className="font-mono text-xs text-muted-foreground">
                                                    {drawing.project_code}
                                                </p>
                                            </td>

                                            <td className="px-6 py-4 text-muted-foreground">
                                                {drawing.deleted_at}
                                            </td>

                                            <td className="px-6 py-4">
                                                <Button
                                                    size="sm"
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
                                                        ? 'Restore project first'
                                                        : 'Restore'}
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
        </AppLayout>
    );
}
