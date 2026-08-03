<?php

namespace App\Http\Controllers;

use App\Models\Drawing;
use App\Models\DrawingRevision;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
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
            $drawing->revisions()->create([
                'uploaded_by' => $user->id,
                'revision_code' => $validated['revision_code'],
                'file_path' => $path,
                'original_filename' =>
                    $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType() ?: null,
                'file_extension' => strtolower(
                    $file->getClientOriginalExtension(),
                ),
                'file_size' => (int) $file->getSize(),
                'revision_notes' =>
                    $validated['revision_notes'] ?? null,
                'issued_at' =>
                    $validated['issued_at'] ?? null,
            ]);
        } catch (Throwable $exception) {
            // Avoid leaving an unused file if the database insert fails.
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
}