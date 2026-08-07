type StatusCounts = {
    draft: number;
    under_review: number;
    approved: number;
    superseded: number;
};

type Props = {
    totalProjects: number;
    totalDrawings: number;
    uploadedRevisions: number;
    openIssues: number;
    statusCounts: StatusCounts;
};

export default function MobileDashboardOverview({
    totalProjects,
    totalDrawings,
    uploadedRevisions,
    openIssues,
    statusCounts,
}: Props) {
    const statuses = [
        {
            label: 'Draft',
            value: statusCounts.draft,
            colour: '#71717a',
        },
        {
            label: 'Under Review',
            value: statusCounts.under_review,
            colour: '#f59e0b',
        },
        {
            label: 'Approved',
            value: statusCounts.approved,
            colour: '#22c55e',
        },
        {
            label: 'Superseded',
            value: statusCounts.superseded,
            colour: '#3b82f6',
        },
    ];

    const total = statuses.reduce((sum, status) => sum + status.value, 0);

    let currentPercentage = 0;

    const segments = statuses.map((status) => {
        const start = currentPercentage;
        const size = total > 0 ? (status.value / total) * 100 : 0;

        currentPercentage += size;

        return `${status.colour} ${start}% ${currentPercentage}%`;
    });

    const chartBackground =
        total > 0 ? `conic-gradient(${segments.join(', ')})` : 'var(--muted)';

    return (
        <div className="mobile-dashboard-layout space-y-4">
            <section className="mobile-kpi-grid grid grid-cols-3 divide-x overflow-hidden rounded-xl border bg-card">
                <div className="p-4 text-center">
                    <p className="text-2xl font-semibold">{totalProjects}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Projects
                    </p>
                </div>

                <div className="p-4 text-center">
                    <p className="text-2xl font-semibold">{totalDrawings}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Drawings
                    </p>
                </div>

                <div className="p-4 text-center">
                    <p className="text-2xl font-semibold">
                        {uploadedRevisions}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Revisions
                    </p>
                </div>

                <div className="ipad-extra-kpi hidden p-4 text-center">
                    <p className="text-2xl font-semibold">{openIssues}</p>

                    <p className="mt-1 text-xs text-muted-foreground">
                        Open Issues
                    </p>
                </div>
            </section>

            <section className="mobile-dashboard-chart flex min-h-0 flex-1 flex-col rounded-xl border bg-card p-5">
                <h2 className="font-semibold">Drawing Overview</h2>

                <div className="mobile-chart-content mt-4 flex min-h-0 flex-1 items-center justify-center gap-6">
                    <div
                        className="relative size-36 shrink-0 rounded-full"
                        style={{
                            background: chartBackground,
                        }}
                    >
                        <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full bg-card">
                            <span className="text-2xl font-semibold">
                                {total}
                            </span>

                            <span className="text-xs text-muted-foreground">
                                drawings
                            </span>
                        </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-3">
                        {statuses.map((status) => (
                            <div
                                key={status.label}
                                className="flex items-center justify-between gap-3 text-sm"
                            >
                                <div className="flex min-w-0 items-center gap-2">
                                    <span
                                        className="size-2.5 shrink-0 rounded-full"
                                        style={{
                                            backgroundColor: status.colour,
                                        }}
                                    />

                                    <span className="truncate text-muted-foreground">
                                        {status.label}
                                    </span>
                                </div>

                                <span className="font-medium">{status.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}