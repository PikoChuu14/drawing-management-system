import type { FormEvent } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';

import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BreadcrumbItem } from '@/types';

type Drawing = {
    id: number;
    drawing_number: string;
    title: string;
    discipline: string | null;
    status: string;
    description: string | null;
    creator_name: string;
    created_at: string;
};

type Project = {
    id: number;
    project_code: string;
    name: string;
    description: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    creator_name: string;
    drawings: Drawing[];
};

type DrawingForm = {
    drawing_number: string;
    title: string;
    discipline: string;
    status: string;
    description: string;
};

type ProjectShowProps = {
    project: Project;
};

export default function ProjectShow({
    project,
}: ProjectShowProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Projects',
            href: '/projects',
        },
        {
            title: project.project_code,
            href: `/projects/${project.id}`,
        },
    ];

    const form = useForm<DrawingForm>({
        drawing_number: '',
        title: '',
        discipline: '',
        status: 'draft',
        description: '',
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.post(`/projects/${project.id}/drawings`, {
            preserveScroll: true,

            onSuccess: () => {
                form.reset();
            },
        });
    };

    const formatStatus = (status: string) => {
        return status.replaceAll('_', ' ');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${project.project_code} Drawings`} />

            <div className="flex flex-1 flex-col gap-6 p-4">
                <div>
                    <Link
                        href="/projects"
                        className="text-sm text-muted-foreground hover:text-foreground"
                    >
                        ← Back to projects
                    </Link>

                    <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row">
                        <div>
                            <p className="font-mono text-sm font-medium text-muted-foreground">
                                {project.project_code}
                            </p>

                            <h1 className="mt-1 text-2xl font-semibold">
                                {project.name}
                            </h1>

                            {project.description && (
                                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                                    {project.description}
                                </p>
                            )}
                        </div>

                        <div className="text-sm">
                            <p className="capitalize">
                                Status: {formatStatus(project.status)}
                            </p>

                            <p className="text-muted-foreground">
                                Created by {project.creator_name}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
                    <section className="rounded-xl border bg-card p-6 shadow-sm">
                        <h2 className="text-lg font-semibold">
                            Register Drawing
                        </h2>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Add a drawing record to this project.
                        </p>

                        <form
                            onSubmit={submit}
                            className="mt-6 space-y-5"
                        >
                            <div className="space-y-2">
                                <Label htmlFor="drawing_number">
                                    Drawing Number
                                </Label>

                                <Input
                                    id="drawing_number"
                                    value={form.data.drawing_number}
                                    onChange={(event) =>
                                        form.setData(
                                            'drawing_number',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Example: M-001"
                                />

                                {form.errors.drawing_number && (
                                    <p className="text-sm text-red-600">
                                        {form.errors.drawing_number}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="title">
                                    Drawing Title
                                </Label>

                                <Input
                                    id="title"
                                    value={form.data.title}
                                    onChange={(event) =>
                                        form.setData(
                                            'title',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Example: Conveyor Layout"
                                />

                                {form.errors.title && (
                                    <p className="text-sm text-red-600">
                                        {form.errors.title}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="discipline">
                                    Discipline
                                </Label>

                                <select
                                    id="discipline"
                                    value={form.data.discipline}
                                    onChange={(event) =>
                                        form.setData(
                                            'discipline',
                                            event.target.value,
                                        )
                                    }
                                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                >
                                    <option value="">
                                        Select discipline
                                    </option>

                                    <option value="Architectural">
                                        Architectural
                                    </option>

                                    <option value="Civil">
                                        Civil
                                    </option>

                                    <option value="Mechanical">
                                        Mechanical
                                    </option>

                                    <option value="Electrical">
                                        Electrical
                                    </option>

                                    <option value="Control">
                                        Control
                                    </option>

                                    <option value="Process">
                                        Process
                                    </option>

                                    <option value="Other">
                                        Other
                                    </option>
                                </select>

                                {form.errors.discipline && (
                                    <p className="text-sm text-red-600">
                                        {form.errors.discipline}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">
                                    Status
                                </Label>

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
                                    <option value="draft">
                                        Draft
                                    </option>

                                    <option value="under_review">
                                        Under Review
                                    </option>

                                    <option value="approved">
                                        Approved
                                    </option>

                                    <option value="superseded">
                                        Superseded
                                    </option>
                                </select>

                                {form.errors.status && (
                                    <p className="text-sm text-red-600">
                                        {form.errors.status}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">
                                    Description
                                </Label>

                                <textarea
                                    id="description"
                                    rows={4}
                                    value={form.data.description}
                                    onChange={(event) =>
                                        form.setData(
                                            'description',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Optional drawing details..."
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                />

                                {form.errors.description && (
                                    <p className="text-sm text-red-600">
                                        {form.errors.description}
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                disabled={form.processing}
                                className="w-full"
                            >
                                {form.processing
                                    ? 'Registering...'
                                    : 'Register Drawing'}
                            </Button>
                        </form>
                    </section>

                    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
                        <div className="border-b p-6">
                            <h2 className="text-lg font-semibold">
                                Drawing Register
                            </h2>

                            <p className="mt-1 text-sm text-muted-foreground">
                                {project.drawings.length}{' '}
                                {project.drawings.length === 1
                                    ? 'drawing'
                                    : 'drawings'}
                            </p>
                        </div>

                        {project.drawings.length === 0 ? (
                            <div className="p-10 text-center">
                                <p className="font-medium">
                                    No drawings registered
                                </p>

                                <p className="mt-1 text-sm text-muted-foreground">
                                    Use the form to add the first drawing.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b bg-muted/50">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">
                                                Number
                                            </th>

                                            <th className="px-6 py-3 font-medium">
                                                Drawing
                                            </th>

                                            <th className="px-6 py-3 font-medium">
                                                Discipline
                                            </th>

                                            <th className="px-6 py-3 font-medium">
                                                Status
                                            </th>

                                            <th className="px-6 py-3 font-medium">
                                                Registered By
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {project.drawings.map((drawing) => (
                                            <tr
                                                key={drawing.id}
                                                className="border-b last:border-b-0"
                                            >
                                                <td className="px-6 py-4 font-mono font-medium">
                                                    {
                                                        drawing.drawing_number
                                                    }
                                                </td>

                                                <td className="px-6 py-4">
                                                    <p className="font-medium">
                                                        {drawing.title}
                                                    </p>

                                                    {drawing.description && (
                                                        <p className="mt-1 max-w-md text-muted-foreground">
                                                            {
                                                                drawing.description
                                                            }
                                                        </p>
                                                    )}
                                                </td>

                                                <td className="px-6 py-4">
                                                    {drawing.discipline ??
                                                        'Not set'}
                                                </td>

                                                <td className="px-6 py-4 capitalize">
                                                    {formatStatus(
                                                        drawing.status,
                                                    )}
                                                </td>

                                                <td className="px-6 py-4">
                                                    <p>
                                                        {
                                                            drawing.creator_name
                                                        }
                                                    </p>

                                                    <p className="text-xs text-muted-foreground">
                                                        {drawing.created_at}
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
            </div>
        </AppLayout>
    );
}