<?php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ArchivedController extends Controller
{
    public function index(): Response
    {
        $projects = Project::query()
            ->where('status', 'archived')
            ->with('creator:id,name')
            ->withCount('drawings')
            ->latest('updated_at')
            ->get()
            ->map(
                fn (Project $project): array => [
                    'id' => $project->id,
                    'project_code' => $project->project_code,
                    'name' => $project->name,
                    'description' => $project->description,
                    'drawing_count' => $project->drawings_count,
                    'creator_name' => $project->creator->name,
                    'archived_at' => $project->updated_at->format('Y-m-d H:i'),
                ],
            );

        return Inertia::render(
            'archived/index',
            [
                'projects' => $projects,
            ],
        );
    }

    public function restore(Project $project): RedirectResponse
    {
        abort_unless(
            $project->status === 'archived',
            404,
        );

        $project->update([
            'status' => 'active',
        ]);

        return to_route('archived.index')
            ->with(
                'success',
                'Project returned to active projects.',
            );
    }
}
