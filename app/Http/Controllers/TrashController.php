<?php

namespace App\Http\Controllers;

use App\Models\Drawing;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class TrashController extends Controller
{
    /**
     * Display deleted projects and drawings.
     */
    public function index(): Response
    {
        $projects = Project::onlyTrashed()
            ->latest('deleted_at')
            ->get()
            ->map(function (Project $project): array {
                return [
                    'id' => $project->id,
                    'project_code' => $project->project_code,
                    'name' => $project->name,
                    'deleted_at' => $project->deleted_at
                        ?->format('Y-m-d H:i'),
                ];
            });

        $drawings = Drawing::onlyTrashed()
            ->latest('deleted_at')
            ->get()
            ->map(function (Drawing $drawing): array {
                $project = Project::withTrashed()
                    ->find($drawing->project_id);

                return [
                    'id' => $drawing->id,
                    'drawing_number' =>
                        $drawing->drawing_number,
                    'title' => $drawing->title,
                    'project_code' =>
                        $project !== null ? $project->project_code : 'Unknown',
                    'project_name' =>
                        $project !== null ? $project->name : 'Unknown project',
                    'project_deleted' =>
                        $project?->trashed() ?? true,
                    'deleted_at' => $drawing->deleted_at
                        ?->format('Y-m-d H:i'),
                ];
            });

        return Inertia::render('trash/index', [
            'projects' => $projects,
            'drawings' => $drawings,
        ]);
    }

    /**
     * Restore a deleted project.
     */
    public function restoreProject(
        int $projectId,
    ): RedirectResponse {
        $project = Project::onlyTrashed()
            ->findOrFail($projectId);

        $project->restore();

        return to_route('trash.index');
    }

    /**
     * Restore a deleted drawing.
     */
    public function restoreDrawing(
        int $drawingId,
    ): RedirectResponse {
        $drawing = Drawing::onlyTrashed()
            ->findOrFail($drawingId);

        $project = Project::withTrashed()
            ->findOrFail($drawing->project_id);

        if ($project->trashed()) {
            return to_route('trash.index')->withErrors([
                'restore' =>
                    'Restore the parent project before restoring this drawing.',
            ]);
        }

        $drawing->restore();

        return to_route('trash.index');
    }
}