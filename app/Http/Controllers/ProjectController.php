<?php

namespace App\Http\Controllers;

use App\Models\Drawing;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    /**
     * Display and filter all projects.
     */
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'search' => [
                'nullable',
                'string',
                'max:100',
            ],
            'status' => [
                'nullable',
                'in:planned,active,on_hold,completed,archived',
            ],
        ]);

        $search = trim(
            (string) ($validated['search'] ?? ''),
        );

        $status = (string) ($validated['status'] ?? '');

        $projects = Project::query()
            ->where('status', '!=', 'archived')
            ->with('creator:id,name')
            ->withCount('drawings')

            // Only apply search when the user entered something.
            ->when(
                $search !== '',
                function (Builder $query) use ($search): void {
                    $query->where(
                        function (Builder $query) use ($search): void {
                            $query
                                ->where(
                                    'project_code',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'name',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'description',
                                    'like',
                                    "%{$search}%",
                                );
                        },
                    );
                },
            )

            // Only filter status when one has been selected.
            ->when(
                $status !== '',
                function (Builder $query) use ($status): void {
                    $query->where('status', $status);
                },
            )

            ->latest()
            ->get()
            ->map(function (Project $project): array {
                return [
                    'id' => $project->id,
                    'project_code' => $project->project_code,
                    'name' => $project->name,
                    'description' => $project->description,
                    'status' => $project->status,
                    'start_date' => $project->start_date
                        ?->format('Y-m-d'),
                    'end_date' => $project->end_date
                        ?->format('Y-m-d'),
                    'creator_name' => $project->creator->name,
                    'drawing_count' => $project->drawings_count,
                ];
            });

        return Inertia::render('projects/index', [
            'projects' => $projects,

            // Return the current filters so React can retain them.
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
        ]);
    }

    /**
     * Display one project and filter its drawings.
     */
    public function show(
        Request $request,
        Project $project,
    ): Response {
        $validated = $request->validate([
            'search' => [
                'nullable',
                'string',
                'max:100',
            ],
            'discipline' => [
                'nullable',
                'in:Architectural,Civil,Mechanical,Electrical,Control,Process,Other',
            ],
            'drawing_status' => [
                'nullable',
                'in:draft,under_review,approved,superseded',
            ],
        ]);

        $search = trim(
            (string) ($validated['search'] ?? ''),
        );

        $discipline = (string) (
            $validated['discipline'] ?? ''
        );

        $drawingStatus = (string) (
            $validated['drawing_status'] ?? ''
        );

        $project->load('creator:id,name');

        $totalDrawings = $project->drawings()->count();

        $drawings = $project->drawings()
            ->with('creator:id,name')

            ->when(
                $search !== '',
                function (Builder $query) use ($search): void {
                    $query->where(
                        function (Builder $query) use ($search): void {
                            $query
                                ->where(
                                    'drawing_number',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'title',
                                    'like',
                                    "%{$search}%",
                                )
                                ->orWhere(
                                    'description',
                                    'like',
                                    "%{$search}%",
                                );
                        },
                    );
                },
            )

            ->when(
                $discipline !== '',
                function (Builder $query) use ($discipline): void {
                    $query->where(
                        'discipline',
                        $discipline,
                    );
                },
            )

            ->when(
                $drawingStatus !== '',
                function (Builder $query) use ($drawingStatus): void {
                    $query->where(
                        'status',
                        $drawingStatus,
                    );
                },
            )

            ->latest()
            ->get()
            ->map(function (Drawing $drawing): array {
                return [
                    'id' => $drawing->id,
                    'drawing_number' => $drawing->drawing_number,
                    'title' => $drawing->title,
                    'discipline' => $drawing->discipline,
                    'status' => $drawing->status,
                    'description' => $drawing->description,
                    'creator_name' => $drawing->creator->name,
                    'created_at' => $drawing->created_at
                        ->format('Y-m-d H:i'),
                ];
            });

        return Inertia::render('projects/show', [
            'project' => [
                'id' => $project->id,
                'project_code' => $project->project_code,
                'name' => $project->name,
                'description' => $project->description,
                'status' => $project->status,
                'start_date' => $project->start_date
                    ?->format('Y-m-d'),
                'end_date' => $project->end_date
                    ?->format('Y-m-d'),
                'creator_name' => $project->creator->name,
                'total_drawings' => $totalDrawings,
                'drawings' => $drawings,
            ],

            'filters' => [
                'search' => $search,
                'discipline' => $discipline,
                'drawing_status' => $drawingStatus,
            ],
        ]);
    }

    /**
     * Save a new project.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'project_code' => [
                'required',
                'string',
                'max:50',
                'unique:projects,project_code',
            ],
            'name' => [
                'required',
                'string',
                'max:255',
            ],
            'description' => [
                'nullable',
                'string',
                'max:2000',
            ],
            'status' => [
                'required',
                'in:planned,active,on_hold,completed,archived',
            ],
            'start_date' => [
                'nullable',
                'date',
            ],
            'end_date' => [
                'nullable',
                'date',
                'after_or_equal:start_date',
            ],
        ]);

        $user = $request->user();

        if (! $user instanceof User) {
            abort(403);
        }

        $user->projects()->create($validated);

        return to_route('projects.index');
    }

    /**
     * Display the project edit form.
     */
    public function edit(Project $project): Response
    {
        return Inertia::render('projects/edit', [
            'project' => [
                'id' => $project->id,
                'project_code' => $project->project_code,
                'name' => $project->name,
                'description' => $project->description,
                'status' => $project->status,
                'start_date' => $project->start_date?->format('Y-m-d'),
                'end_date' => $project->end_date?->format('Y-m-d'),
            ],
        ]);
    }

    /**
     * Update a project.
     */
    public function update(
        Request $request,
        Project $project,
    ): RedirectResponse {
        $validated = $request->validate([
            'project_code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('projects', 'project_code')
                    ->ignore($project),
            ],

            'name' => [
                'required',
                'string',
                'max:255',
            ],

            'description' => [
                'nullable',
                'string',
                'max:2000',
            ],

            'status' => [
                'required',
                Rule::in([
                    'planned',
                    'active',
                    'on_hold',
                    'completed',
                    'archived',
                ]),
            ],

            'start_date' => [
                'nullable',
                'date',
            ],

            'end_date' => [
                'nullable',
                'date',
                'after_or_equal:start_date',
            ],
        ]);

        $project->update($validated);

        return to_route('projects.show', $project);
    }

    /**
     * Archive a project without deleting it.
     */
    public function archive(Project $project): RedirectResponse
    {
        $project->update([
            'status' => 'archived',
        ]);

        return to_route('projects.show', $project);
    }

    /**
     * Move a project to the Trash.
     */
    public function destroy(Project $project): RedirectResponse
    {
        $project->delete();

        return to_route('projects.index');
    }
}
