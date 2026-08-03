<?php

namespace App\Http\Controllers;

use App\Models\Drawing;
use App\Models\Project;
use App\Models\SiteIssue;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

class SiteIssueController extends Controller
{
    /**
     * Store a newly reported site issue.
     */
    public function store(
        Request $request,
        Project $project,
        Drawing $drawing,
    ): RedirectResponse {
        $this->ensureDrawingBelongsToProject(
            $project,
            $drawing,
        );

        $validated = $request->validate([
            'title' => [
                'required',
                'string',
                'max:255',
            ],

            'description' => [
                'required',
                'string',
                'max:3000',
            ],

            'location' => [
                'nullable',
                'string',
                'max:255',
            ],

            'priority' => [
                'required',
                Rule::in([
                    'low',
                    'medium',
                    'high',
                    'critical',
                ]),
            ],

            'photo' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',

                // Maximum 5 MB.
                'max:5120',
            ],
        ]);

        $user = $request->user();

        if (! $user instanceof User) {
            abort(403);
        }

        $photo = $request->file('photo');
        $photoPath = null;
        $photoOriginalName = null;

        if ($photo !== null) {
            if (! $photo->isValid()) {
                abort(422, 'The uploaded photo is invalid.');
            }

            $photoPath = $photo->store(
                "drawings/{$drawing->id}/issues",
                'local',
            );

            if ($photoPath === false) {
                abort(500, 'The photo could not be stored.');
            }

            $photoOriginalName =
                $photo->getClientOriginalName();
        }

        try {
            DB::transaction(
                function () use (
                    $drawing,
                    $user,
                    $validated,
                    $photoPath,
                    $photoOriginalName,
                ): void {
                    $issue = $drawing->siteIssues()->create([
                        'reported_by' => $user->id,
                        'title' => $validated['title'],
                        'description' =>
                            $validated['description'],
                        'location' =>
                            $validated['location'] ?? null,
                        'priority' => $validated['priority'],
                        'status' => 'open',
                        'photo_path' => $photoPath,
                        'photo_original_name' =>
                            $photoOriginalName,
                    ]);

                    $issue->update([
                        'issue_number' => sprintf(
                            'ISS-%04d',
                            (int) $issue->id,
                        ),
                    ]);
                },
            );
        } catch (Throwable $exception) {
            if ($photoPath !== null) {
                Storage::disk('local')->delete(
                    $photoPath,
                );
            }

            throw $exception;
        }

        return to_route(
            'drawings.show',
            [$project, $drawing],
        );
    }

    /**
     * Display the issue edit form.
     */
    public function edit(
        Project $project,
        Drawing $drawing,
        SiteIssue $siteIssue,
    ): Response {
        $this->ensureIssueBelongsToDrawing(
            $project,
            $drawing,
            $siteIssue,
        );

        return Inertia::render('issues/edit', [
            'project' => [
                'id' => $project->id,
                'project_code' => $project->project_code,
                'name' => $project->name,
            ],

            'drawing' => [
                'id' => $drawing->id,
                'drawing_number' =>
                    $drawing->drawing_number,
                'title' => $drawing->title,
            ],

            'issue' => [
                'id' => $siteIssue->id,
                'issue_number' =>
                    $siteIssue->issue_number,
                'title' => $siteIssue->title,
                'description' =>
                    $siteIssue->description,
                'location' => $siteIssue->location,
                'priority' => $siteIssue->priority,
                'status' => $siteIssue->status,
                'resolution' =>
                    $siteIssue->resolution,
                'has_photo' =>
                    $siteIssue->photo_path !== null,
            ],
        ]);
    }

    /**
     * Update the issue status and details.
     */
    public function update(
        Request $request,
        Project $project,
        Drawing $drawing,
        SiteIssue $siteIssue,
    ): RedirectResponse {
        $this->ensureIssueBelongsToDrawing(
            $project,
            $drawing,
            $siteIssue,
        );

        $validated = $request->validate([
            'title' => [
                'required',
                'string',
                'max:255',
            ],

            'description' => [
                'required',
                'string',
                'max:3000',
            ],

            'location' => [
                'nullable',
                'string',
                'max:255',
            ],

            'priority' => [
                'required',
                Rule::in([
                    'low',
                    'medium',
                    'high',
                    'critical',
                ]),
            ],

            'status' => [
                'required',
                Rule::in([
                    'open',
                    'in_progress',
                    'resolved',
                    'closed',
                ]),
            ],

            'resolution' => [
                'nullable',
                'string',
                'max:3000',
                'required_if:status,resolved,closed',
            ],
        ]);

        $isResolved = in_array(
            $validated['status'],
            ['resolved', 'closed'],
            true,
        );

        $siteIssue->update([
            'title' => $validated['title'],
            'description' => $validated['description'],
            'location' =>
                $validated['location'] ?? null,
            'priority' => $validated['priority'],
            'status' => $validated['status'],
            'resolution' =>
                $validated['resolution'] ?? null,

            'resolved_at' => $isResolved
                ? ($siteIssue->resolved_at ?? now())
                : null,
        ]);

        return to_route(
            'drawings.show',
            [$project, $drawing],
        );
    }

    /**
     * Display a private issue photo.
     */
    public function photo(
        Project $project,
        Drawing $drawing,
        SiteIssue $siteIssue,
    ): BinaryFileResponse {
        $this->ensureIssueBelongsToDrawing(
            $project,
            $drawing,
            $siteIssue,
        );

        abort_unless(
            $siteIssue->photo_path !== null,
            404,
        );

        abort_unless(
            Storage::disk('local')->exists(
                $siteIssue->photo_path,
            ),
            404,
        );

        return response()->file(
            Storage::disk('local')->path(
                $siteIssue->photo_path,
            ),
        );
    }

    private function ensureDrawingBelongsToProject(
        Project $project,
        Drawing $drawing,
    ): void {
        abort_unless(
            $drawing->project_id === $project->id,
            404,
        );
    }

    private function ensureIssueBelongsToDrawing(
        Project $project,
        Drawing $drawing,
        SiteIssue $siteIssue,
    ): void {
        $this->ensureDrawingBelongsToProject(
            $project,
            $drawing,
        );

        abort_unless(
            $siteIssue->drawing_id === $drawing->id,
            404,
        );
    }
}