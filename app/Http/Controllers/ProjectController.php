<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    /**
     * Display all projects.
     */
    public function index(): Response
    {
        $projects = Project::query()
            ->with('creator:id,name')
            ->latest()
            ->get();

        $projectData = [];

        foreach ($projects as $project) {
            $projectData[] = [
                'id' => $project->id,
                'project_code' => $project->project_code,
                'name' => $project->name,
                'description' => $project->description,
                'status' => $project->status,
                'start_date' => $project->start_date?->format('Y-m-d'),
                'end_date' => $project->end_date?->format('Y-m-d'),
                'creator_name' => $project->creator->name,
            ];
        }

        return Inertia::render('projects/index', [
            'projects' => $projectData,
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
}