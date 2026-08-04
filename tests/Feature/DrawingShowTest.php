<?php

use App\Models\Drawing;
use App\Models\DrawingRevision;
use App\Models\Project;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('drawing show response exposes translation metadata for revisions', function () {
    $user = User::factory()->create();

    $project = Project::create([
        'created_by' => $user->id,
        'project_code' => 'PRJ-001',
        'name' => 'Sample Project',
        'description' => 'A sample project',
        'status' => 'active',
    ]);

    $drawing = Drawing::create([
        'project_id' => $project->id,
        'created_by' => $user->id,
        'drawing_number' => 'D-100',
        'title' => 'Main Drawing',
        'discipline' => 'Architectural',
        'status' => 'draft',
        'description' => 'A sample drawing',
    ]);

    $requestedAt = now()->subHour();
    $completedAt = now();

    $revision = DrawingRevision::create([
        'drawing_id' => $drawing->id,
        'uploaded_by' => $user->id,
        'revision_code' => 'R1',
        'file_path' => 'drawings/sample.dwg',
        'original_filename' => 'sample.dwg',
        'mime_type' => 'application/octet-stream',
        'file_extension' => 'dwg',
        'file_size' => 1024,
        'revision_notes' => 'Initial revision',
        'issued_at' => now()->subDay()->toDateString(),
        'translation_status' => 'ready',
        'translation_progress' => 'Completed',
        'translation_error' => null,
        'translation_requested_at' => $requestedAt,
        'translation_completed_at' => $completedAt,
    ]);

    $response = $this->actingAs($user)
        ->get(route('drawings.show', [$project, $drawing]));

    $response->assertOk();

    $response->assertInertia(fn (Assert $page) => $page
        ->where('drawing.revisions.0.id', $revision->id)
        ->where('drawing.revisions.0.translation_status', 'ready')
        ->where('drawing.revisions.0.translation_progress', 'Completed')
        ->where('drawing.revisions.0.translation_error', null)
        ->where('drawing.revisions.0.translation_requested_at', $requestedAt->format('Y-m-d H:i'))
        ->where('drawing.revisions.0.translation_completed_at', $completedAt->format('Y-m-d H:i'))
    );
});
