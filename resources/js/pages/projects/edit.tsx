import { Head, Link, useForm } from '@inertiajs/react';
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
};

type ProjectForm = {
    project_code: string;
    name: string;
    description: string;
    status: string;
    start_date: string;
    end_date: string;
};

type ProjectEditProps = {
    project: Project;
};

export default function ProjectEdit({ project }: ProjectEditProps) {
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
            title: 'Edit',
            href: `/projects/${project.id}/edit`,
        },
    ];

    const form = useForm<ProjectForm>({
        project_code: project.project_code,
        name: project.name,
        description: project.description ?? '',
        status: project.status,
        start_date: project.start_date ?? '',
        end_date: project.end_date ?? '',
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.put(`/projects/${project.id}`, {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${project.project_code}`} />

            <div className="flex flex-1 justify-center p-4 md:p-6">
                <section className="w-full max-w-2xl rounded-xl border bg-card p-6 shadow-sm">
                    <div>
                        <h1 className="text-2xl font-semibold">Edit Project</h1>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Update the project information and status.
                        </p>
                    </div>

                    <form onSubmit={submit} className="mt-6 space-y-5">
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
                                rows={5}
                                value={form.data.description}
                                onChange={(event) =>
                                    form.setData(
                                        'description',
                                        event.target.value,
                                    )
                                }
                                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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

                        <div className="flex justify-end gap-3">
                            <Button asChild type="button" variant="outline">
                                <Link href={`/projects/${project.id}`}>
                                    Cancel
                                </Link>
                            </Button>

                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </section>
            </div>
        </AppLayout>
    );
}
