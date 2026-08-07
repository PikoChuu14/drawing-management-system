<?php

namespace App\Http\Controllers;

use App\Models\Drawing;
use App\Models\DrawingRevision;
use App\Models\Project;
use App\Models\SiteIssue;
use App\Services\ApsService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

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
                    'drawing_number' => $drawing->drawing_number,
                    'title' => $drawing->title,
                    'project_code' => $project !== null ? $project->project_code : 'Unknown',
                    'project_name' => $project !== null ? $project->name : 'Unknown project',
                    'project_deleted' => $project?->trashed() ?? true,
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
                'restore' => 'Restore the parent project before restoring this drawing.',
            ]);
        }

        $drawing->restore();

        return to_route('trash.index');
    }

    public function destroyProject(
        int $project,
        ApsService $apsService,
    ): RedirectResponse {
        $projectRecord = Project::onlyTrashed()
            ->findOrFail($project);

        $drawings = Drawing::withTrashed()
            ->where(
                'project_id',
                $projectRecord->id,
            )
            ->get();

        try {
            /*
            * Clean all files and APS resources first.
            */
            foreach ($drawings as $drawing) {
                $revisions = DrawingRevision::query()
                    ->where(
                        'drawing_id',
                        $drawing->id,
                    )
                    ->get();

                foreach ($revisions as $revision) {
                    /*
                    * Remove Autodesk processing resources
                    * when this revision was sent to APS.
                    */
                    $apsService->deleteRevisionAssets(
                        $revision->aps_urn,
                        $revision->aps_object_key,
                    );

                    /*
                    * Remove Laravel's private drawing file.
                    */
                    if ($revision->file_path) {
                        Storage::disk('local')->delete(
                            $revision->file_path,
                        );
                    }
                }

                /*
                * Remove site issue photos.
                */
                $issues = SiteIssue::query()
                    ->where(
                        'drawing_id',
                        $drawing->id,
                    )
                    ->get();

                foreach ($issues as $issue) {
                    if ($issue->photo_path) {
                        Storage::disk('local')->delete(
                            $issue->photo_path,
                        );
                    }
                }
            }
        } catch (Throwable $exception) {
            Log::error(
                'Permanent project cleanup failed.',
                [
                    'project_id' => $projectRecord->id,

                    'message' => $exception->getMessage(),
                ],
            );

            return to_route('trash.index')
                ->withErrors([
                    'project' => 'The project was not permanently deleted because some stored files could not be cleaned up. '
                        .$exception->getMessage(),
                ]);
        }

        DB::transaction(
            function () use (
                $projectRecord,
                $drawings,
            ): void {
                foreach ($drawings as $drawing) {
                    /*
                    * Avoid the circular relationship:
                    *
                    * Drawing -> current revision
                    * Revision -> drawing
                    */
                    $drawing->update([
                        'current_revision_id' => null,
                    ]);

                    SiteIssue::query()
                        ->where(
                            'drawing_id',
                            $drawing->id,
                        )
                        ->delete();

                    DrawingRevision::query()
                        ->where(
                            'drawing_id',
                            $drawing->id,
                        )
                        ->delete();

                    /*
                    * Drawing uses SoftDeletes, therefore
                    * forceDelete actually removes the row.
                    */
                    $drawing->forceDelete();
                }

                /*
                * Permanently remove the project itself.
                */
                $projectRecord->forceDelete();
            },
        );

        return to_route('trash.index')
            ->with(
                'success',
                'Project permanently deleted.',
            );
    }

    public function destroyDrawing(
        int $drawing,
        ApsService $apsService,
    ): RedirectResponse {
        $drawingRecord = Drawing::onlyTrashed()
            ->findOrFail($drawing);

        $revisions = DrawingRevision::query()
            ->where(
                'drawing_id',
                $drawingRecord->id,
            )
            ->get();

        $issues = SiteIssue::query()
            ->where(
                'drawing_id',
                $drawingRecord->id,
            )
            ->get();

        try {
            foreach ($revisions as $revision) {
                $apsService->deleteRevisionAssets(
                    $revision->aps_urn,
                    $revision->aps_object_key,
                );

                if ($revision->file_path) {
                    Storage::disk('local')->delete(
                        $revision->file_path,
                    );
                }
            }

            foreach ($issues as $issue) {
                if ($issue->photo_path) {
                    Storage::disk('local')->delete(
                        $issue->photo_path,
                    );
                }
            }
        } catch (Throwable $exception) {
            Log::error(
                'Permanent drawing cleanup failed.',
                [
                    'drawing_id' => $drawingRecord->id,

                    'message' => $exception->getMessage(),
                ],
            );

            return to_route('trash.index')
                ->withErrors([
                    'drawing' => 'The drawing was not permanently deleted because its stored files could not be cleaned up. '
                        .$exception->getMessage(),
                ]);
        }

        DB::transaction(
            function () use (
                $drawingRecord,
            ): void {
                $drawingRecord->update([
                    'current_revision_id' => null,
                ]);

                SiteIssue::query()
                    ->where(
                        'drawing_id',
                        $drawingRecord->id,
                    )
                    ->delete();

                DrawingRevision::query()
                    ->where(
                        'drawing_id',
                        $drawingRecord->id,
                    )
                    ->delete();

                $drawingRecord->forceDelete();
            },
        );

        return to_route('trash.index')
            ->with(
                'success',
                'Drawing permanently deleted.',
            );
    }
}
