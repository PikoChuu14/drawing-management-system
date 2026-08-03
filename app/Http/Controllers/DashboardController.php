<?php

namespace App\Http\Controllers;

use App\Models\Drawing;
use App\Models\DrawingRevision;
use App\Models\Project;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the system dashboard.
     */
    public function index(): Response
    {
        $drawingStatusCounts = [
            'draft' => Drawing::query()
                ->where('status', 'draft')
                ->count(),

            'under_review' => Drawing::query()
                ->where('status', 'under_review')
                ->count(),

            'approved' => Drawing::query()
                ->where('status', 'approved')
                ->count(),

            'superseded' => Drawing::query()
                ->where('status', 'superseded')
                ->count(),
        ];

        $recentProjects = Project::query()
            ->withCount('drawings')
            ->latest()
            ->limit(5)
            ->get()
            ->map(function (Project $project): array {
                return [
                    'id' => $project->id,
                    'project_code' => $project->project_code,
                    'name' => $project->name,
                    'status' => $project->status,
                    'drawing_count' => (int) $project->drawings_count,
                    'created_at' => $project->created_at
                        ->format('Y-m-d H:i'),
                ];
            });

        $recentRevisions = DrawingRevision::query()
            ->whereHas('drawing.project')
            ->with([
                'uploader:id,name',
                'drawing:id,project_id,drawing_number,title',
                'drawing.project:id,project_code,name',
            ])
            ->latest()
            ->limit(5)
            ->get()
            ->map(function (DrawingRevision $revision): array {
                return [
                    'id' => $revision->id,
                    'revision_code' => $revision->revision_code,
                    'original_filename' =>
                        $revision->original_filename,
                    'file_size' => $revision->file_size,

                    'drawing_id' => $revision->drawing->id,
                    'drawing_number' =>
                        $revision->drawing->drawing_number,
                    'drawing_title' =>
                        $revision->drawing->title,

                    'project_id' =>
                        $revision->drawing->project->id,
                    'project_code' =>
                        $revision->drawing->project->project_code,
                    'project_name' =>
                        $revision->drawing->project->name,

                    'uploaded_by' =>
                        $revision->uploader->name,
                    'uploaded_at' =>
                        $revision->created_at->format(
                            'Y-m-d H:i',
                        ),
                ];
            });

        return Inertia::render('dashboard', [
            'summary' => [
                'total_projects' => Project::query()->count(),

                'active_projects' => Project::query()
                    ->where('status', 'active')
                    ->count(),

                'total_drawings' => Drawing::query()->count(),

                'approved_drawings' => Drawing::query()
                    ->where('status', 'approved')
                    ->count(),

                'total_revisions' =>
                    DrawingRevision::query()
                        ->whereHas('drawing.project')
                        ->count(),
            ],

            'drawingStatusCounts' => $drawingStatusCounts,
            'recentProjects' => $recentProjects,
            'recentRevisions' => $recentRevisions,
        ]);
    }
}