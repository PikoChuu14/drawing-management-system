<?php

namespace App\Http\Controllers;

use App\Models\Drawing;
use App\Models\DrawingRevision;
use App\Models\Project;
use App\Models\User;
use App\Services\ApsService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class DrawingRevisionController extends Controller
{
    /**
     * Upload a new revision file.
     */
    public function store(
        Request $request,
        Project $project,
        Drawing $drawing,
    ): RedirectResponse {
        abort_unless(
            $drawing->project_id === $project->id,
            404,
        );

        $validated = $request->validate([
            'revision_code' => [
                'required',
                'string',
                'max:50',

                Rule::unique(
                    'drawing_revisions',
                    'revision_code',
                )->where(
                    fn ($query) => $query->where(
                        'drawing_id',
                        $drawing->id,
                    ),
                ),
            ],

            'issued_at' => [
                'nullable',
                'date',
            ],

            'revision_notes' => [
                'nullable',
                'string',
                'max:2000',
            ],

            'file' => [
                'required',
                'file',

                // Maximum 50 MB
                'max:51200',

                // User-supplied file extension
                'extensions:pdf,dwg,dxf',

                // Content MIME types commonly returned for these files
                'mimetypes:application/pdf,application/acad,application/x-acad,application/autocad,application/dwg,image/vnd.dwg,application/octet-stream,text/plain',
            ],
        ]);

        $user = $request->user();

        if (! $user instanceof User) {
            abort(403);
        }

        $file = $request->file('file');

        if ($file === null) {
            abort(422, 'The revision file is missing.');
        }

        $path = $file->store(
            "drawings/{$drawing->id}/revisions",
            'local',
        );

        if ($path === false) {
            abort(500, 'The revision file could not be stored.');
        }

        try {
            DB::transaction(
                function () use (
                    $drawing,
                    $user,
                    $validated,
                    $file,
                    $path,
                ): void {
                    $revision =
                        $drawing->revisions()->create([
                            'uploaded_by' => $user->id,

                            'revision_code' => $validated[
                                    'revision_code'
                                ],

                            'file_path' => $path,

                            'original_filename' => $file
                                ->getClientOriginalName(),

                            'mime_type' => $file->getMimeType()
                                    ?: null,

                            'file_extension' => strtolower(
                                $file
                                    ->getClientOriginalExtension(),
                            ),

                            'file_size' => (int) $file->getSize(),

                            'revision_notes' => $validated[
                                    'revision_notes'
                                ] ?? null,

                            'issued_at' => $validated[
                                    'issued_at'
                                ] ?? null,
                        ]);

                    /*
                     * The newly uploaded revision becomes current.
                     * The previous current revision is now derived
                     * as superseded.
                     */
                    $drawing->update([
                        'current_revision_id' => $revision->id,
                    ]);
                },
            );
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($path);

            throw $exception;
        }

        return to_route(
            'drawings.show',
            [$project, $drawing],
        );
    }

    /**
     * Download a private revision file.
     */
    public function download(
        Project $project,
        Drawing $drawing,
        DrawingRevision $revision,
    ): StreamedResponse {
        abort_unless(
            $drawing->project_id === $project->id,
            404,
        );

        abort_unless(
            $revision->drawing_id === $drawing->id,
            404,
        );

        abort_unless(
            Storage::disk('local')->exists(
                $revision->file_path,
            ),
            404,
        );

        return Storage::disk('local')->download(
            $revision->file_path,
            $revision->original_filename,
        );
    }

    /**
     * Display a PDF revision inside the browser.
     */
    public function preview(
        Project $project,
        Drawing $drawing,
        DrawingRevision $revision,
    ): BinaryFileResponse {
        // Ensure the drawing belongs to the requested project.
        abort_unless(
            $drawing->project_id === $project->id,
            404,
        );

        // Ensure the revision belongs to the requested drawing.
        abort_unless(
            $revision->drawing_id === $drawing->id,
            404,
        );

        // Only PDF files may use this preview route.
        abort_unless(
            strtolower(
                (string) $revision->file_extension,
            ) === 'pdf',
            404,
        );

        $disk = Storage::disk('local');

        abort_unless(
            $disk->exists($revision->file_path),
            404,
        );

        $response = response()->file(
            $disk->path($revision->file_path),
            [
                'Content-Type' => 'application/pdf',
                'X-Content-Type-Options' => 'nosniff',
                'Cache-Control' => 'private, no-store, max-age=0',
            ],
        );

        $response->setContentDisposition(
            'inline',
            $revision->original_filename,
        );

        return $response;
    }

    /**
     * Upload a DWG revision to APS and request translation.
     */
    public function processForPreview(
        Project $project,
        Drawing $drawing,
        DrawingRevision $revision,
        ApsService $apsService,
    ): RedirectResponse {
        $this->ensureRevisionBelongsToDrawing(
            $project,
            $drawing,
            $revision,
        );

        abort_unless(
            strtolower(
                (string) $revision->file_extension,
            ) === 'dwg',
            422,
            'Only DWG files can use APS processing.',
        );

        $disk = Storage::disk('local');

        abort_unless(
            $disk->exists($revision->file_path),
            404,
            'The original DWG file could not be found.',
        );

        if ($revision->translation_status === 'ready') {
            return to_route(
                'drawings.show',
                [$project, $drawing],
            );
        }

        try {
            $objectId = $revision->aps_object_id;

            /*
            * Reuse an object that was already uploaded when a
            * previous translation request failed.
            */
            if (
                ! is_string($objectId)
                || $objectId === ''
            ) {
                $revision->update([
                    'translation_status' => 'uploading',
                    'translation_progress' => null,
                    'translation_error' => null,
                ]);

                $extension = strtolower(
                    (string) $revision->file_extension,
                );

                $objectKey = sprintf(
                    'drawing-%d-revision-%d-%s.%s',
                    $drawing->id,
                    $revision->id,
                    Str::uuid()->toString(),
                    $extension,
                );

                $upload = $apsService->uploadObject(
                    $disk->path($revision->file_path),
                    $objectKey,
                    'application/octet-stream',
                );

                $objectId = $upload['object_id'];

                $revision->update([
                    'aps_object_key' => $upload['object_key'],

                    'aps_object_id' => $objectId,

                    'translation_status' => 'processing',
                ]);
            }

            $translation = $apsService->startTranslation(
                $objectId,
            );

            $revision->update([
                'aps_urn' => $translation['urn'],

                'translation_status' => 'processing',

                'translation_progress' => 'Translation requested',

                'translation_error' => null,

                'translation_requested_at' => now(),

                'translation_completed_at' => null,
            ]);
        } catch (Throwable $exception) {
            $revision->update([
                'translation_status' => 'failed',

                'translation_error' => Str::limit(
                    $exception->getMessage(),
                    2000,
                ),
            ]);

            return to_route(
                'drawings.show',
                [$project, $drawing],
            )->withErrors([
                'aps' => $exception->getMessage(),
            ]);
        }

        return to_route(
            'drawings.show',
            [$project, $drawing],
        );
    }

    /**
     * Refresh the APS translation status.
     */
    public function refreshTranslationStatus(
        Project $project,
        Drawing $drawing,
        DrawingRevision $revision,
        ApsService $apsService,
    ): RedirectResponse {
        $this->ensureRevisionBelongsToDrawing(
            $project,
            $drawing,
            $revision,
        );

        abort_unless(
            strtolower(
                (string) $revision->file_extension,
            ) === 'dwg',
            422,
        );

        abort_unless(
            is_string($revision->aps_urn)
                && $revision->aps_urn !== '',
            422,
            'This revision has not been submitted to APS.',
        );

        try {
            $manifest = $apsService->translationStatus(
                $revision->aps_urn,
            );

            $applicationStatus = match (
                $manifest['status']
            ) {
                'success' => 'ready',
                'failed' => 'failed',

                'pending',
                'inprogress' => 'processing',

                default => 'processing',
            };

            $revision->update([
                'translation_status' => $applicationStatus,

                'translation_progress' => $manifest['progress'],

                'translation_error' => $manifest['error'],

                'translation_completed_at' => $applicationStatus === 'ready'
                        ? now()
                        : null,
            ]);
        } catch (Throwable $exception) {
            return to_route(
                'drawings.show',
                [$project, $drawing],
            )->withErrors([
                'aps' => $exception->getMessage(),
            ]);
        }

        return to_route(
            'drawings.show',
            [$project, $drawing],
        );
    }

    private function ensureRevisionBelongsToDrawing(
        Project $project,
        Drawing $drawing,
        DrawingRevision $revision,
    ): void {
        abort_unless(
            $drawing->project_id === $project->id,
            404,
        );

        abort_unless(
            $revision->drawing_id === $drawing->id,
            404,
        );
    }

    /**
     * Edit revision metadata.
     *
     * The original revision file is deliberately not replaced.
     */
    public function update(
        Request $request,
        Project $project,
        Drawing $drawing,
        DrawingRevision $revision,
    ): RedirectResponse {
        $this->ensureRevisionBelongsToDrawing(
            $project,
            $drawing,
            $revision,
        );

        $validated = $request->validate([
            'revision_code' => [
                'required',
                'string',
                'max:50',

                Rule::unique(
                    'drawing_revisions',
                    'revision_code',
                )
                    ->where(
                        fn ($query) => $query->where(
                            'drawing_id',
                            $drawing->id,
                        ),
                    )
                    ->ignore($revision),
            ],

            'issued_at' => [
                'nullable',
                'date',
            ],

            'revision_notes' => [
                'nullable',
                'string',
                'max:2000',
            ],
        ]);

        $revision->update($validated);

        return to_route(
            'drawings.show',
            [$project, $drawing],
        );
    }

    /**
     * Set an existing revision as current.
     */
    public function makeCurrent(
        Project $project,
        Drawing $drawing,
        DrawingRevision $revision,
    ): RedirectResponse {
        $this->ensureRevisionBelongsToDrawing(
            $project,
            $drawing,
            $revision,
        );

        if ($revision->archived_at !== null) {
            return to_route(
                'drawings.show',
                [$project, $drawing],
            )->withErrors([
                'revision' => 'Restore the archived revision before making it current.',
            ]);
        }

        $drawing->update([
            'current_revision_id' => $revision->id,
        ]);

        return to_route(
            'drawings.show',
            [$project, $drawing],
        );
    }

    /**
     * Archive a superseded revision.
     */
    public function archive(
        Project $project,
        Drawing $drawing,
        DrawingRevision $revision,
    ): RedirectResponse {
        $this->ensureRevisionBelongsToDrawing(
            $project,
            $drawing,
            $revision,
        );

        if (
            $drawing->current_revision_id ===
            $revision->id
        ) {
            return to_route(
                'drawings.show',
                [$project, $drawing],
            )->withErrors([
                'revision' => 'The current revision cannot be archived. Make another revision current first.',
            ]);
        }

        $revision->update([
            'archived_at' => now(),
        ]);

        return to_route(
            'drawings.show',
            [$project, $drawing],
        );
    }

    /**
     * Restore an archived revision.
     */
    public function restore(
        Project $project,
        Drawing $drawing,
        DrawingRevision $revision,
    ): RedirectResponse {
        $this->ensureRevisionBelongsToDrawing(
            $project,
            $drawing,
            $revision,
        );

        $revision->update([
            'archived_at' => null,
        ]);

        return to_route(
            'drawings.show',
            [$project, $drawing],
        );
    }

    /**
     * Permanently delete a non-current revision and all
     * associated local and APS files.
     */
    public function destroy(
        Project $project,
        Drawing $drawing,
        DrawingRevision $revision,
        ApsService $apsService,
    ): RedirectResponse {
        $this->ensureRevisionBelongsToDrawing(
            $project,
            $drawing,
            $revision,
        );

        /*
        * The active revision must always remain traceable.
        * Another revision must be made current first.
        */
        if (
            $drawing->current_revision_id ===
            $revision->id
        ) {
            return to_route(
                'drawings.show',
                [$project, $drawing],
            )->withErrors([
                'revision' =>
                    'The current revision cannot be deleted. '
                    .'Upload or select another current revision first.',
            ]);
        }

        $localFilePath = $revision->file_path;

        try {
            /*
            * Do this before deleting the database record.
            * The APS identifiers remain available when a
            * cloud request fails and the user needs to retry.
            */
            $apsService->deleteRevisionAssets(
                $revision->aps_urn,
                $revision->aps_object_key,
            );
        } catch (Throwable $exception) {
            Log::error(
                'APS revision cleanup failed.',
                [
                    'revision_id' => $revision->id,
                    'drawing_id' => $drawing->id,
                    'aps_object_key' =>
                        $revision->aps_object_key,
                    'message' =>
                        $exception->getMessage(),
                ],
            );

            return to_route(
                'drawings.show',
                [$project, $drawing],
            )->withErrors([
                'revision' =>
                    'The revision was not deleted because '
                    .'its Autodesk APS files could not be '
                    .'cleaned up. Please try again. Details: '
                    .$exception->getMessage(),
            ]);
        }

        /*
        * APS cleanup succeeded, so the database record can
        * now be permanently removed.
        */
        $revision->delete();

        /*
        * Remove the original private Laravel copy.
        */
        $localDeleted = Storage::disk('local')->delete(
            $localFilePath,
        );

        if (! $localDeleted) {
            /*
            * The database record is already gone, so log the
            * unusual local-storage failure for maintenance.
            */
            Log::warning(
                'Revision database record was deleted, but its local file could not be removed.',
                [
                    'drawing_id' => $drawing->id,
                    'file_path' => $localFilePath,
                ],
            );
        }

        return to_route(
            'drawings.show',
            [$project, $drawing],
        );
    }
}
