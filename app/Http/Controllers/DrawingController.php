<?php

namespace App\Http\Controllers;

use App\Models\Drawing;
use App\Models\DrawingRevision;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
        ]);

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

                'revisions' => $drawing->revisions
                    ->map(function (DrawingRevision $revision): array {
                        return [
                            'id' => $revision->id,
                            'revision_code' => $revision->revision_code,
                            'original_filename' => $revision->original_filename,
                            'file_extension' => $revision->file_extension,
                            'file_size' => $revision->file_size,
                            'revision_notes' => $revision->revision_notes,
                            'issued_at' => $revision->issued_at
                                ?->format('Y-m-d'),
                            'uploaded_by' => $revision->uploader?->name,
                            'uploaded_at' => $revision->created_at
                                ->format('Y-m-d H:i'),
                        ];
                    }),
            ],
        ]);
    }
}
