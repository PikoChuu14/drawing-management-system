<?php

namespace App\Http\Controllers;

use App\Models\SiteIssue;
use Inertia\Inertia;
use Inertia\Response;

class IssueInboxController extends Controller
{
    public function index(): Response
    {
        $issues = SiteIssue::query()
            ->where('status', '!=', 'resolved')
            ->whereHas('drawing.project')
            ->with([
                'drawing:id,project_id,drawing_number,title',
                'drawing.project:id,project_code,name',
            ])
            ->latest('created_at')
            ->get()
            ->map(
                fn (SiteIssue $issue): array => [
                    'id' => $issue->id,

                    'issue_number' => $issue->issue_number,

                    'title' => $issue->title,

                    'priority' => $issue->priority,

                    'status' => $issue->status,

                    'location' => $issue->location,

                    'description' => $issue->description,

                    'has_photo' => ! empty($issue->photo_path),

                    'created_at' => $issue->created_at
                        ->format('Y-m-d H:i'),

                    'drawing_id' => $issue->drawing->id,

                    'drawing_number' => $issue->drawing
                        ->drawing_number,

                    'drawing_title' => $issue->drawing->title,

                    'project_id' => $issue->drawing
                        ->project->id,

                    'project_code' => $issue->drawing
                        ->project
                        ->project_code,

                    'project_name' => $issue->drawing
                        ->project->name,
                ],
            );

        return Inertia::render(
            'issues/index',
            [
                'issues' => $issues,
            ],
        );
    }
}
