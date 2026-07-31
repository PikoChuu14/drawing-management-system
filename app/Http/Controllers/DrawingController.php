<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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
}