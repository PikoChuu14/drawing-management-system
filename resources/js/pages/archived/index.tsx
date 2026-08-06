import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import {
    Head,
    router,
} from '@inertiajs/react';
import { ArchiveRestore } from 'lucide-react';

type ArchivedProject = {
    id: number;
    project_code: string;
    name: string;
    description: string | null;
    drawing_count: number;
    creator_name: string;
    archived_at: string;
};

type Props = {
    projects: ArchivedProject[];
};

export default function ArchivedIndex({
    projects,
}: Props) {
    const restoreProject = (
        project: ArchivedProject,
    ) => {
        if (
            !window.confirm(
                `Return ${project.project_code} to active projects?`,
            )
        ) {
            return;
        }

        router.patch(
            `/archived/projects/${project.id}/restore`,
            {},
            {
                preserveScroll: true,
            },
        );
    };

    return (
        <AppLayout>
            <Head title="Archived" />

            <div className="flex flex-1 flex-col gap-6 px-3 py-4 sm:p-6">
                <div>
                    <h1 className="text-2xl font-semibold">
                        Archived
                    </h1>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Projects hidden from the active project register.
                    </p>
                </div>

                <section className="overflow-hidden rounded-xl border bg-card">
                    {projects.length === 0 ? (
                        <div className="p-10 text-center">
                            <p className="font-medium">
                                No archived projects
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {projects.map((project) => (
                                <article
                                    key={project.id}
                                    className="p-5 sm:p-6"
                                >
                                    <p className="font-mono text-sm text-muted-foreground">
                                        {project.project_code}
                                    </p>

                                    <h2 className="mt-1 text-lg font-semibold">
                                        {project.name}
                                    </h2>

                                    {project.description && (
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {project.description}
                                        </p>
                                    )}

                                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                        <span>
                                            {project.drawing_count} drawings
                                        </span>

                                        <span className="text-muted-foreground">
                                            Archived {project.archived_at}
                                        </span>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="mt-5 h-11 gap-2"
                                        onClick={() =>
                                            restoreProject(
                                                project,
                                            )
                                        }
                                    >
                                        <ArchiveRestore className="size-4" />
                                        Return to Active
                                    </Button>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </AppLayout>
    );
}