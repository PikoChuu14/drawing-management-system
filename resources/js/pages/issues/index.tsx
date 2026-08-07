import { Head, Link } from '@inertiajs/react';
import { CircleAlert, MapPin } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';

type Issue = {
    id: number;
    issue_number: string;
    title: string;
    priority: string;
    status: string;
    location: string | null;
    description: string;
    has_photo: boolean;
    created_at: string;

    drawing_id: number;
    drawing_number: string;
    drawing_title: string;

    project_id: number;
    project_code: string;
    project_name: string;
};

type Props = {
    issues: Issue[];
};

const formatStatus = (value: string): string =>
    value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());

export default function IssuesIndex({ issues }: Props) {
    return (
        <AppLayout>
            <Head title="Issues" />

            <div className="flex flex-1 flex-col gap-5 px-3 py-4 sm:p-6">
                <div>
                    <div className="flex items-center gap-3">
                        <CircleAlert className="size-6" />

                        <h1 className="text-2xl font-semibold">Issues</h1>
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Unresolved site issues requiring attention.
                    </p>
                </div>

                <section className="overflow-hidden rounded-xl border bg-card">
                    <div className="border-b px-5 py-4 sm:px-6">
                        <p className="text-sm text-muted-foreground">
                            {issues.length}{' '}
                            {issues.length === 1
                                ? 'unresolved issue'
                                : 'unresolved issues'}
                        </p>
                    </div>

                    {issues.length === 0 ? (
                        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                            <CircleAlert className="size-9 text-muted-foreground" />

                            <p className="mt-4 font-medium">
                                No unresolved issues
                            </p>

                            <p className="mt-1 text-sm text-muted-foreground">
                                All reported site issues have been resolved.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {issues.map((issue) => (
                                <article key={issue.id} className="p-5 sm:p-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="font-mono text-sm text-muted-foreground">
                                                {issue.issue_number}
                                            </p>

                                            <Link
                                                href={`/projects/${issue.project_id}/drawings/${issue.drawing_id}/issues/${issue.id}/edit`}
                                                className="mt-1 block text-lg font-semibold hover:underline"
                                            >
                                                {issue.title}
                                            </Link>
                                        </div>

                                        <div className="flex shrink-0 flex-wrap gap-2">
                                            <span className="rounded-full border px-2.5 py-1 text-xs capitalize">
                                                {formatStatus(issue.priority)}
                                            </span>

                                            <span className="rounded-full border px-2.5 py-1 text-xs">
                                                {formatStatus(issue.status)}
                                            </span>
                                        </div>
                                    </div>

                                    {issue.description && (
                                        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                                            {issue.description}
                                        </p>
                                    )}

                                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                        <Link
                                            href={`/projects/${issue.project_id}`}
                                            className="hover:underline"
                                        >
                                            {issue.project_code} —{' '}
                                            {issue.project_name}
                                        </Link>

                                        <Link
                                            href={`/projects/${issue.project_id}/drawings/${issue.drawing_id}`}
                                            className="hover:underline"
                                        >
                                            {issue.drawing_number} —{' '}
                                            {issue.drawing_title}
                                        </Link>
                                    </div>

                                    {issue.location && (
                                        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                                            <MapPin className="size-4" />

                                            <span>{issue.location}</span>
                                        </div>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </AppLayout>
    );
}
