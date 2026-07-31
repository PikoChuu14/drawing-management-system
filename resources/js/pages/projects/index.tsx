import { Head, useForm } from '@inertiajs/react';
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
    description: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    creator_name: string;
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
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Projects',
        href: '/projects',
    },
];

export default function ProjectsIndex({ projects }: ProjectsPageProps) {
    const form = useForm<ProjectForm>({
        project_code: '',
        name: '',
        description: '',
        status: 'active',
        start_date: '',
        end_date: '',
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.post('/projects', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
            },
        });
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

                <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
                    <section className="rounded-xl border bg-card p-6 shadow-sm">
                        <h2 className="text-lg font-semibold">
                            Create Project
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Enter the basic information for the new project.
                        </p>

                        <form onSubmit={submit} className="mt-6 space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="project_code">
                                    Project Code
                                </Label>

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
                                        form.setData(
                                            'status',
                                            event.target.value,
                                        )
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
                                    <Label htmlFor="start_date">
                                        Start Date
                                    </Label>

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

                            <Button
                                type="submit"
                                disabled={form.processing}
                                className="w-full"
                            >
                                {form.processing
                                    ? 'Creating...'
                                    : 'Create Project'}
                            </Button>

                            {form.recentlySuccessful && (
                                <p className="text-center text-sm text-green-600">
                                    Project created successfully.
                                </p>
                            )}
                        </form>
                    </section>

                    <section className="rounded-xl border bg-card shadow-sm">
                        <div className="border-b p-6">
                            <h2 className="text-lg font-semibold">
                                Existing Projects
                            </h2>

                            <p className="mt-1 text-sm text-muted-foreground">
                                {projects.length} project
                                {projects.length === 1 ? '' : 's'} registered
                            </p>
                        </div>

                        {projects.length === 0 ? (
                            <div className="p-10 text-center">
                                <p className="font-medium">No projects yet</p>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Use the form to create your first project.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
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
                                                    <p className="font-medium">
                                                        {project.name}
                                                    </p>

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
                                                    {project.creator_name}
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
