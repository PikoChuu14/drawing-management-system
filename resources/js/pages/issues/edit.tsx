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
};

type Drawing = {
    id: number;
    drawing_number: string;
    title: string;
};

type SiteIssue = {
    id: number;
    issue_number: string;
    title: string;
    description: string;
    location: string | null;
    priority: string;
    status: string;
    resolution: string | null;
    has_photo: boolean;
};

type IssueForm = {
    title: string;
    description: string;
    location: string;
    priority: string;
    status: string;
    resolution: string;
};

type IssueEditProps = {
    project: Project;
    drawing: Drawing;
    issue: SiteIssue;
};

export default function IssueEdit({ project, drawing, issue }: IssueEditProps) {
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
        {
            title: issue.issue_number,
            href: `/projects/${project.id}/drawings/${drawing.id}/issues/${issue.id}/edit`,
        },
    ];

    const form = useForm<IssueForm>({
        title: issue.title,
        description: issue.description,
        location: issue.location ?? '',
        priority: issue.priority,
        status: issue.status,
        resolution: issue.resolution ?? '',
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.put(
            `/projects/${project.id}/drawings/${drawing.id}/issues/${issue.id}`,
            {
                preserveScroll: true,
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Update ${issue.issue_number}`} />

            <div className="flex flex-1 justify-center px-3 py-4 sm:px-5 md:p-6">
                <section className="w-full max-w-2xl rounded-xl border bg-card p-6 shadow-sm">
                    <div>
                        <p className="font-mono text-sm text-muted-foreground">
                            {issue.issue_number}
                        </p>

                        <h1 className="mt-1 text-2xl font-semibold">
                            Update Site Issue
                        </h1>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Record progress and explain how the issue was
                            resolved.
                        </p>
                    </div>

                    <form onSubmit={submit} className="mt-6 space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="title">Issue Title</Label>

                            <Input
                                id="title"
                                value={form.data.title}
                                onChange={(event) =>
                                    form.setData('title', event.target.value)
                                }
                            />

                            {form.errors.title && (
                                <p className="text-sm text-red-600">
                                    {form.errors.title}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>

                            <Input
                                id="location"
                                value={form.data.location}
                                onChange={(event) =>
                                    form.setData('location', event.target.value)
                                }
                            />

                            {form.errors.location && (
                                <p className="text-sm text-red-600">
                                    {form.errors.location}
                                </p>
                            )}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="priority">Priority</Label>

                                <select
                                    id="priority"
                                    value={form.data.priority}
                                    onChange={(event) =>
                                        form.setData(
                                            'priority',
                                            event.target.value,
                                        )
                                    }
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                </select>

                                {form.errors.priority && (
                                    <p className="text-sm text-red-600">
                                        {form.errors.priority}
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
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
                                >
                                    <option value="open">Open</option>
                                    <option value="in_progress">
                                        In Progress
                                    </option>
                                    <option value="resolved">Resolved</option>
                                    <option value="closed">Closed</option>
                                </select>

                                {form.errors.status && (
                                    <p className="text-sm text-red-600">
                                        {form.errors.status}
                                    </p>
                                )}
                            </div>
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
                                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none"
                            />

                            {form.errors.description && (
                                <p className="text-sm text-red-600">
                                    {form.errors.description}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="resolution">Resolution</Label>

                            <textarea
                                id="resolution"
                                rows={5}
                                value={form.data.resolution}
                                onChange={(event) =>
                                    form.setData(
                                        'resolution',
                                        event.target.value,
                                    )
                                }
                                placeholder="Explain the corrective action..."
                                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none"
                            />

                            <p className="text-xs text-muted-foreground">
                                Required when marking the issue as Resolved or
                                Closed.
                            </p>

                            {form.errors.resolution && (
                                <p className="text-sm text-red-600">
                                    {form.errors.resolution}
                                </p>
                            )}
                        </div>

                        {issue.has_photo && (
                            <Button asChild type="button" variant="outline">
                                <a
                                    href={`/projects/${project.id}/drawings/${drawing.id}/issues/${issue.id}/photo`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    View Existing Photo
                                </a>
                            </Button>
                        )}

                        <div className="flex justify-end gap-3">
                            <Button asChild type="button" variant="outline">
                                <Link
                                    href={`/projects/${project.id}/drawings/${drawing.id}`}
                                >
                                    Cancel
                                </Link>
                            </Button>

                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Saving...' : 'Save Issue'}
                            </Button>
                        </div>
                    </form>
                </section>
            </div>
        </AppLayout>
    );
}
