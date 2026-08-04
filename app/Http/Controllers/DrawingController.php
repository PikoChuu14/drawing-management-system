<?php

namespace App\Http\Controllers;

use App\Models\Drawing;
use App\Models\DrawingRevision;
use App\Models\Project;
use App\Models\SiteIssue;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DrawingController extends Controller
{
    /**
     * Register a drawing under a project.
     */
    public function store(
        Request $request,
        Project $project,
    ): RedirectResponse {
        $validated = $request->validate([
            'drawing_number' => [
                'required',
                'string',
                'max:100',
                Rule::unique('drawings', 'drawing_number')
                    ->where(
                        fn ($query) => $query->where(
                            'project_id',
                            $project->id,
                        ),
                    ),
            ],

            'title' => [
                'required',
                'string',
                'max:255',
            ],

            'discipline' => [
                'nullable',
                'string',
                'max:100',
            ],

            'status' => [
                'required',
                Rule::in([
                    'draft',
                    'under_review',
                    'approved',
                    'superseded',
                ]),
            ],

            'description' => [
                'nullable',
                'string',
                'max:2000',
            ],
        ]);

        $user = $request->user();

        if (! $user instanceof User) {
            abort(403);
        }

        $project->drawings()->create([
            ...$validated,
            'created_by' => $user->id,
        ]);

        return to_route('projects.show', $project);
    }

    /**
     * Display one drawing and its revision history.
     */
    public function show(
        Project $project,
        Drawing $drawing,
    ): Response {
        abort_unless(
            $drawing->project_id === $project->id,
            404,
        );

        $drawing->load([
            'creator:id,name',

            'revisions' => function ($query): void {
                $query
                    ->with('uploader:id,name')
                    ->latest();
            },

            'siteIssues' => function ($query): void {
                $query
                    ->with('reporter:id,name')
                    ->latest();
            },
        ]);

        $revisions = $drawing->revisions()->get();
        $issues = $drawing->siteIssues()->get();

        return Inertia::render('drawings/show', [
            'project' => [
                'id' => $project->id,
                'project_code' => $project->project_code,
                'name' => $project->name,
            ],

            'drawing' => [
                'id' => $drawing->id,
                'drawing_number' => $drawing->drawing_number,
                'title' => $drawing->title,
                'discipline' => $drawing->discipline,
                'status' => $drawing->status,
                'description' => $drawing->description,
                'creator_name' => $drawing->creator->name,

                'revisions' => array_map(
                    function (DrawingRevision $revision): array {
                        return [
                            'id' => $revision->id,
                            'revision_code' => $revision->revision_code,
                            'original_filename' => $revision->original_filename,
                            'file_extension' => $revision->file_extension,
                            'file_size' => $revision->file_size,
                            'revision_notes' => $revision->revision_notes,
                            'issued_at' => $revision->issued_at === null
                                ? null
                                : Carbon::parse((string) $revision->issued_at)
                                    ->format('Y-m-d'),
                            'uploaded_by' => $revision->uploader?->name,
                            'uploaded_at' => Carbon::parse((string) $revision->created_at)
                                ->format('Y-m-d H:i'),
                            'translation_status' =>
                                $revision->translation_status,
                            'translation_progress' =>
                                $revision->translation_progress,
                            'translation_error' =>
                                $revision->translation_error,
                            'translation_requested_at' =>
                                $revision->translation_requested_at === null
                                    ? null
                                    : Carbon::parse((string) $revision->translation_requested_at)
                                        ->format('Y-m-d H:i'),
                            'translation_completed_at' =>
                                $revision->translation_completed_at === null
                                    ? null
                                    : Carbon::parse((string) $revision->translation_completed_at)
                                        ->format('Y-m-d H:i'),

                            'can_preview' => strtolower(
                                (string) $revision->file_extension,
                            ) === 'pdf',

                        ];
                    },
                    $revisions->all(),
                ),

                'issues' => array_map(
                    function (SiteIssue $issue): array {
                        return [
                            'id' => $issue->id,
                            'issue_number' => $issue->issue_number,
                            'title' => $issue->title,
                            'description' => $issue->description,
                            'location' => $issue->location,
                            'priority' => $issue->priority,
                            'status' => $issue->status,
                            'resolution' => $issue->resolution,
                            'has_photo' => $issue->photo_path !== null,
                            'reported_by' => $issue->reporter->name,
                            'reported_at' => Carbon::parse((string) $issue->created_at)
                                ->format('Y-m-d H:i'),
                            'resolved_at' => $issue->resolved_at === null
                                ? null
                                : Carbon::parse((string) $issue->resolved_at)
                                    ->format('Y-m-d H:i'),
                        ];
                    },
                    $issues->all(),
                ),
            ],
        ]);
    }

    /**
     * Display the drawing edit form.
     */
    public function edit(
        Project $project,
        Drawing $drawing,
    ): Response {
        abort_unless(
            $drawing->project_id === $project->id,
            404,
        );

        return Inertia::render('drawings/edit', [
            'project' => [
                'id' => $project->id,
                'project_code' => $project->project_code,
                'name' => $project->name,
            ],

            'drawing' => [
                'id' => $drawing->id,
                'drawing_number' => $drawing->drawing_number,
                'title' => $drawing->title,
                'discipline' => $drawing->discipline,
                'status' => $drawing->status,
                'description' => $drawing->description,
            ],
        ]);
    }

    /**
     * Update a drawing.
     */
    public function update(
        Request $request,
        Project $project,
        Drawing $drawing,
    ): RedirectResponse {
        abort_unless(
            $drawing->project_id === $project->id,
            404,
        );

        $validated = $request->validate([
            'drawing_number' => [
                'required',
                'string',
                'max:100',

                Rule::unique('drawings', 'drawing_number')
                    ->where(
                        fn ($query) => $query->where(
                            'project_id',
                            $project->id,
                        ),
                    )
                    ->ignore($drawing),
            ],

            'title' => [
                'required',
                'string',
                'max:255',
            ],

            'discipline' => [
                'nullable',
                Rule::in([
                    'Architectural',
                    'Civil',
                    'Mechanical',
                    'Electrical',
                    'Control',
                    'Process',
                    'Other',
                ]),
            ],

            'status' => [
                'required',
                Rule::in([
                    'draft',
                    'under_review',
                    'approved',
                    'superseded',
                ]),
            ],

            'description' => [
                'nullable',
                'string',
                'max:2000',
            ],
        ]);

        $drawing->update($validated);

        return to_route(
            'drawings.show',
            [$project, $drawing],
        );
    }

    /**
     * Move a drawing to the Trash.
     */
    public function destroy(
        Project $project,
        Drawing $drawing,
    ): RedirectResponse {
        abort_unless(
            $drawing->project_id === $project->id,
            404,
        );

        $drawing->delete();

        return to_route('projects.show', $project);
    }
}
