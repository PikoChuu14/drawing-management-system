import { Head, Link, router, useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import FormModal from '@/components/form-modal';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Project = {
    id: number;
    project_code: string;
    name: string;
    description: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    creator_name: string;
    drawing_count: number;
};

type ProjectForm = {
    project_code: string;
    name: string;
    description: string;
    status: string;
    start_date: string;
    end_date: string;
};

type ProjectsPageProps = {
    projects: Project[];
    filters: ProjectFilters;
};

type ProjectFilters = {
    search: string;
    status: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Projects',
        href: '/projects',
    },
];

export default function ProjectsIndex({
    projects,
    filters,
}: ProjectsPageProps) {
    const [createProjectOpen, setCreateProjectOpen] = useState(false);

    const form = useForm<ProjectForm>({
        project_code: '',
        name: '',
        description: '',
        status: 'active',
        start_date: '',
        end_date: '',
    });

    const filterForm = useForm<ProjectFilters>({
        search: filters.search,
        status: filters.status,
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.post('/projects', {
            preserveScroll: true,

            onSuccess: () => {
                form.reset();
                form.clearErrors();
                setCreateProjectOpen(false);
            },
        });
    };

    const closeCreateProject = () => {
        if (form.processing) {
            return;
        }

        form.reset();
        form.clearErrors();
        setCreateProjectOpen(false);
    };

    const submitFilters = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        filterForm.get('/projects', {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        filterForm.reset();

        router.get(
            '/projects',
            {},
            {
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const formatStatus = (status: string) => {
        return status.replace(/_/g, ' ');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Projects" />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-4">
                <div>
                    <h1 className="text-2xl font-semibold">
                        Project Management
                    </h1>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Create projects and organise their engineering drawings.
                    </p>
                </div>

                <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                    <div className="border-b p-5 sm:p-6">
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Existing Projects
                                </h2>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    {projects.length} matching{' '}
                                    {projects.length === 1
                                        ? 'project'
                                        : 'projects'}
                                </p>
                            </div>

                            <Button
                                type="button"
                                className="h-11 gap-2"
                                onClick={() => setCreateProjectOpen(true)}
                            >
                                <Plus className="size-4" />
                                Create Project
                            </Button>
                        </div>

                        <form
                            onSubmit={submitFilters}
                            className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_180px_auto_auto]"
                        >
                            <Input
                                type="search"
                                value={filterForm.data.search}
                                onChange={(event) =>
                                    filterForm.setData(
                                        'search',
                                        event.target.value,
                                    )
                                }
                                placeholder="Search code, name or description..."
                                aria-label="Search projects"
                            />

                            <select
                                value={filterForm.data.status}
                                onChange={(event) =>
                                    filterForm.setData(
                                        'status',
                                        event.target.value,
                                    )
                                }
                                aria-label="Filter project status"
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            >
                                <option value="">All statuses</option>
                                <option value="planned">Planned</option>
                                <option value="active">Active</option>
                                <option value="on_hold">On Hold</option>
                                <option value="completed">Completed</option>
                                <option value="archived">Archived</option>
                            </select>

                            <Button
                                type="submit"
                                disabled={filterForm.processing}
                            >
                                {filterForm.processing
                                    ? 'Searching...'
                                    : 'Search'}
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={clearFilters}
                            >
                                Clear
                            </Button>
                        </form>
                    </div>

                    {projects.length === 0 ? (
                        <div className="p-10 text-center">
                            <p className="font-medium">No matching projects</p>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Adjust the filters or create a new project.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="divide-y xl:hidden">
                                {projects.map((project) => (
                                    <article
                                        key={project.id}
                                        className="p-5 sm:p-6"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="font-mono text-sm font-semibold text-muted-foreground">
                                                    {project.project_code}
                                                </p>

                                                <Link
                                                    href={`/projects/${project.id}`}
                                                    className="mt-1 block text-lg font-semibold hover:underline"
                                                >
                                                    {project.name}
                                                </Link>
                                            </div>

                                            <span className="shrink-0 rounded-full border px-2.5 py-1 text-xs capitalize">
                                                {formatStatus(project.status)}
                                            </span>
                                        </div>

                                        {project.description && (
                                            <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                                                {project.description}
                                            </p>
                                        )}

                                        <dl className="mt-5 grid grid-cols-2 gap-4 rounded-lg bg-muted/40 p-4 text-sm">
                                            <div>
                                                <dt className="text-xs text-muted-foreground">
                                                    Drawings
                                                </dt>

                                                <dd className="mt-1 font-semibold">
                                                    {project.drawing_count}
                                                </dd>
                                            </div>

                                            <div>
                                                <dt className="text-xs text-muted-foreground">
                                                    Created By
                                                </dt>

                                                <dd className="mt-1 truncate font-medium">
                                                    {project.creator_name}
                                                </dd>
                                            </div>

                                            <div>
                                                <dt className="text-xs text-muted-foreground">
                                                    Start Date
                                                </dt>

                                                <dd className="mt-1 font-medium">
                                                    {project.start_date ??
                                                        'Not set'}
                                                </dd>
                                            </div>

                                            <div>
                                                <dt className="text-xs text-muted-foreground">
                                                    End Date
                                                </dt>

                                                <dd className="mt-1 font-medium">
                                                    {project.end_date ??
                                                        'Not set'}
                                                </dd>
                                            </div>
                                        </dl>

                                        <Button
                                            asChild
                                            className="mt-5 h-11 w-full"
                                        >
                                            <Link
                                                href={`/projects/${project.id}`}
                                            >
                                                Open Project
                                            </Link>
                                        </Button>
                                    </article>
                                ))}
                            </div>

                            <div className="hidden overflow-x-auto xl:block">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b bg-muted/50">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">
                                                Code
                                            </th>

                                            <th className="px-6 py-3 font-medium">
                                                Project
                                            </th>

                                            <th className="px-6 py-3 font-medium">
                                                Status
                                            </th>

                                            <th className="px-6 py-3 font-medium">
                                                Dates
                                            </th>

                                            <th className="px-6 py-3 font-medium">
                                                Drawings
                                            </th>

                                            <th className="px-6 py-3 font-medium">
                                                Matching
                                            </th>

                                            <th className="px-6 py-3 font-medium">
                                                Created By
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {projects.map((project) => (
                                            <tr
                                                key={project.id}
                                                className="border-b last:border-b-0"
                                            >
                                                <td className="px-6 py-4 font-mono font-medium">
                                                    {project.project_code}
                                                </td>

                                                <td className="px-6 py-4">
                                                    <Link
                                                        href={`/projects/${project.id}`}
                                                        className="font-medium hover:underline"
                                                    >
                                                        {project.name}
                                                    </Link>

                                                    {project.description && (
                                                        <p className="mt-1 max-w-md text-muted-foreground">
                                                            {
                                                                project.description
                                                            }
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="px-6 py-4 capitalize">
                                                    {formatStatus(
                                                        project.status,
                                                    )}
                                                </td>

                                                <td className="px-6 py-4 text-muted-foreground">
                                                    <p>
                                                        Start:{' '}
                                                        {project.start_date ??
                                                            'Not set'}
                                                    </p>

                                                    <p>
                                                        End:{' '}
                                                        {project.end_date ??
                                                            'Not set'}
                                                    </p>
                                                </td>

                                                <td className="px-6 py-4">
                                                    {project.drawing_count}
                                                </td>

                                                <td className="px-6 py-4">
                                                    {project.creator_name}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </section>

                <FormModal
                    open={createProjectOpen}
                    title="Create Project"
                    description="Enter the basic information for the new project."
                    onClose={closeCreateProject}
                >
                    <form onSubmit={submit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="project_code">Project Code</Label>

                            <Input
                                id="project_code"
                                value={form.data.project_code}
                                onChange={(event) =>
                                    form.setData(
                                        'project_code',
                                        event.target.value,
                                    )
                                }
                                placeholder="Example: ASRS-2026-01"
                            />

                            {form.errors.project_code && (
                                <p className="text-sm text-red-600">
                                    {form.errors.project_code}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Project Name</Label>

                            <Input
                                id="name"
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                                placeholder="Example: ASRS Warehouse Upgrade"
                            />

                            {form.errors.name && (
                                <p className="text-sm text-red-600">
                                    {form.errors.name}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>

                            <textarea
                                id="description"
                                value={form.data.description}
                                onChange={(event) =>
                                    form.setData(
                                        'description',
                                        event.target.value,
                                    )
                                }
                                placeholder="Describe the project..."
                                rows={4}
                                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            />

                            {form.errors.description && (
                                <p className="text-sm text-red-600">
                                    {form.errors.description}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>

                            <select
                                id="status"
                                value={form.data.status}
                                onChange={(event) =>
                                    form.setData('status', event.target.value)
                                }
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            >
                                <option value="planned">Planned</option>

                                <option value="active">Active</option>

                                <option value="on_hold">On Hold</option>

                                <option value="completed">Completed</option>

                                <option value="archived">Archived</option>
                            </select>

                            {form.errors.status && (
                                <p className="text-sm text-red-600">
                                    {form.errors.status}
                                </p>
                            )}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="start_date">Start Date</Label>

                                <Input
                                    id="start_date"
                                    type="date"
                                    value={form.data.start_date}
                                    onChange={(event) =>
                                        form.setData(
                                            'start_date',
                                            event.target.value,
                                        )
                                    }
                                />

                                {form.errors.start_date && (
                                    <p className="text-sm text-red-600">
                                        {form.errors.start_date}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="end_date">End Date</Label>

                                <Input
                                    id="end_date"
                                    type="date"
                                    value={form.data.end_date}
                                    onChange={(event) =>
                                        form.setData(
                                            'end_date',
                                            event.target.value,
                                        )
                                    }
                                />

                                {form.errors.end_date && (
                                    <p className="text-sm text-red-600">
                                        {form.errors.end_date}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={form.processing}
                                onClick={closeCreateProject}
                            >
                                Cancel
                            </Button>

                            <Button type="submit" disabled={form.processing}>
                                {form.processing
                                    ? 'Creating...'
                                    : 'Create Project'}
                            </Button>
                        </div>

                        {form.recentlySuccessful && (
                            <p className="text-sm text-green-600">
                                Project created successfully.
                            </p>
                        )}
                    </form>
                </FormModal>
            </div>
        </AppLayout>
    );
}
