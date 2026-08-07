<?php

namespace Tests\Feature;

use App\Models\Drawing;
use App\Models\DrawingRevision;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DrawingRevisionLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Project $project;

    private Drawing $drawing;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        $this->user = User::factory()->create();

        $this->project = Project::create([
            'project_code' => 'TEST-001',
            'name' => 'Automated Test Project',
            'description' => 'Project created by automated tests.',
            'status' => 'active',
            'start_date' => now()->toDateString(),
            'end_date' => null,
            'created_by' => $this->user->id,
        ]);

        $this->drawing = Drawing::create([
            'project_id' => $this->project->id,
            'drawing_number' => 'M-001',
            'title' => 'Main Conveyor Layout',
            'discipline' => 'mechanical',
            'status' => 'active',
            'description' => 'Drawing created by automated tests.',
            'created_by' => $this->user->id,
        ]);
    }

    public function test_newly_uploaded_revision_becomes_current(): void
    {
        $response = $this
            ->actingAs($this->user)
            ->post(
                $this->revisionStoreUrl(),
                [
                    'revision_code' => '0',
                    'issued_at' => now()->toDateString(),
                    'revision_notes' => 'Initial issue.',
                    'file' => UploadedFile::fake()->create(
                        'revision-0.pdf',
                        500,
                        'application/pdf',
                    ),
                ],
            );

        $response->assertRedirect();

        $revision = DrawingRevision::query()
            ->where('drawing_id', $this->drawing->id)
            ->where('revision_code', '0')
            ->firstOrFail();

        $this->assertDatabaseHas('drawing_revisions', [
            'id' => $revision->id,
            'drawing_id' => $this->drawing->id,
            'revision_code' => '0',
        ]);

        $this->assertSame(
            $revision->id,
            $this->drawing->fresh()->current_revision_id,
        );

        Storage::disk('local')->assertExists(
            $revision->file_path,
        );
    }

    public function test_new_upload_replaces_the_previous_current_revision(): void
    {
        $revisionZero = $this->createRevision('0');

        $this->drawing->update([
            'current_revision_id' => $revisionZero->id,
        ]);

        $response = $this
            ->actingAs($this->user)
            ->post(
                $this->revisionStoreUrl(),
                [
                    'revision_code' => 'A',
                    'issued_at' => now()->toDateString(),
                    'revision_notes' => 'Design review changes.',
                    'file' => UploadedFile::fake()->create(
                        'revision-a.pdf',
                        500,
                        'application/pdf',
                    ),
                ],
            );

        $response->assertRedirect();

        $revisionA = DrawingRevision::query()
            ->where('drawing_id', $this->drawing->id)
            ->where('revision_code', 'A')
            ->firstOrFail();

        $this->assertSame(
            $revisionA->id,
            $this->drawing->fresh()->current_revision_id,
        );

        /*
         * Revision 0 is now superseded because it is:
         * - not current
         * - not archived
         */
        $this->assertNull(
            $revisionZero->fresh()->archived_at,
        );

        $this->assertNotSame(
            $revisionZero->id,
            $this->drawing->fresh()->current_revision_id,
        );
    }

    public function test_current_revision_cannot_be_archived(): void
    {
        $revision = $this->createRevision('A');

        $this->drawing->update([
            'current_revision_id' => $revision->id,
        ]);

        $response = $this
            ->actingAs($this->user)
            ->patch(
                $this->revisionActionUrl(
                    $revision,
                    'archive',
                ),
            );

        $response->assertSessionHasErrors('revision');

        $this->assertNull(
            $revision->fresh()->archived_at,
        );

        $this->assertSame(
            $revision->id,
            $this->drawing->fresh()->current_revision_id,
        );
    }

    public function test_superseded_revision_can_be_archived(): void
    {
        $revisionZero = $this->createRevision('0');
        $revisionA = $this->createRevision('A');

        $this->drawing->update([
            'current_revision_id' => $revisionA->id,
        ]);

        $response = $this
            ->actingAs($this->user)
            ->patch(
                $this->revisionActionUrl(
                    $revisionZero,
                    'archive',
                ),
            );

        $response->assertRedirect();

        $this->assertNotNull(
            $revisionZero->fresh()->archived_at,
        );

        $this->assertSame(
            $revisionA->id,
            $this->drawing->fresh()->current_revision_id,
        );
    }

    public function test_archived_revision_can_be_restored(): void
    {
        $revisionZero = $this->createRevision(
            '0',
            archived: true,
        );

        $revisionA = $this->createRevision('A');

        $this->drawing->update([
            'current_revision_id' => $revisionA->id,
        ]);

        $response = $this
            ->actingAs($this->user)
            ->patch(
                $this->revisionActionUrl(
                    $revisionZero,
                    'restore',
                ),
            );

        $response->assertRedirect();

        $this->assertNull(
            $revisionZero->fresh()->archived_at,
        );

        /*
         * Restoring does not automatically make the old
         * revision current.
         */
        $this->assertSame(
            $revisionA->id,
            $this->drawing->fresh()->current_revision_id,
        );
    }

    public function test_restored_revision_can_be_made_current(): void
    {
        $revisionZero = $this->createRevision('0');
        $revisionA = $this->createRevision('A');

        $this->drawing->update([
            'current_revision_id' => $revisionA->id,
        ]);

        $response = $this
            ->actingAs($this->user)
            ->patch(
                $this->revisionActionUrl(
                    $revisionZero,
                    'make-current',
                ),
            );

        $response->assertRedirect();

        $this->assertSame(
            $revisionZero->id,
            $this->drawing->fresh()->current_revision_id,
        );
    }

    public function test_archived_revision_cannot_be_made_current(): void
    {
        $archivedRevision = $this->createRevision(
            '0',
            archived: true,
        );

        $currentRevision = $this->createRevision('A');

        $this->drawing->update([
            'current_revision_id' => $currentRevision->id,
        ]);

        $response = $this
            ->actingAs($this->user)
            ->patch(
                $this->revisionActionUrl(
                    $archivedRevision,
                    'make-current',
                ),
            );

        $response->assertSessionHasErrors('revision');

        $this->assertSame(
            $currentRevision->id,
            $this->drawing->fresh()->current_revision_id,
        );
    }

    public function test_current_revision_cannot_be_permanently_deleted(): void
    {
        $revision = $this->createRevision('A');

        $this->drawing->update([
            'current_revision_id' => $revision->id,
        ]);

        $response = $this
            ->actingAs($this->user)
            ->delete(
                $this->revisionUrl($revision),
            );

        $response->assertSessionHasErrors('revision');

        $this->assertDatabaseHas('drawing_revisions', [
            'id' => $revision->id,
        ]);

        Storage::disk('local')->assertExists(
            $revision->file_path,
        );
    }

    public function test_non_current_pdf_revision_can_be_permanently_deleted(): void
    {
        $oldRevision = $this->createRevision('0');
        $currentRevision = $this->createRevision('A');

        $this->drawing->update([
            'current_revision_id' => $currentRevision->id,
        ]);

        $oldFilePath = $oldRevision->file_path;

        $response = $this
            ->actingAs($this->user)
            ->delete(
                $this->revisionUrl($oldRevision),
            );

        $response->assertRedirect();

        $this->assertDatabaseMissing('drawing_revisions', [
            'id' => $oldRevision->id,
        ]);

        Storage::disk('local')->assertMissing(
            $oldFilePath,
        );

        $this->assertDatabaseHas('drawing_revisions', [
            'id' => $currentRevision->id,
        ]);
    }

    public function test_revision_code_must_be_unique_within_the_same_drawing(): void
    {
        $this->createRevision('A');

        $response = $this
            ->actingAs($this->user)
            ->post(
                $this->revisionStoreUrl(),
                [
                    'revision_code' => 'A',
                    'issued_at' => now()->toDateString(),
                    'revision_notes' => 'Duplicate revision.',
                    'file' => UploadedFile::fake()->create(
                        'duplicate-a.pdf',
                        500,
                        'application/pdf',
                    ),
                ],
            );

        $response->assertSessionHasErrors(
            'revision_code',
        );

        $this->assertSame(
            1,
            DrawingRevision::query()
                ->where('drawing_id', $this->drawing->id)
                ->where('revision_code', 'A')
                ->count(),
        );
    }

    public function test_revision_from_another_drawing_cannot_be_managed(): void
    {
        $otherDrawing = Drawing::create([
            'project_id' => $this->project->id,
            'drawing_number' => 'E-001',
            'title' => 'Electrical Layout',
            'discipline' => 'electrical',
            'status' => 'active',
            'description' => null,
            'created_by' => $this->user->id,
        ]);

        $otherRevision = $this->createRevisionForDrawing(
            $otherDrawing,
            '0',
        );

        $response = $this
            ->actingAs($this->user)
            ->patch(
                /*
                 * URL intentionally uses the first drawing
                 * while passing the other drawing's revision.
                 */
                "/projects/{$this->project->id}"
                ."/drawings/{$this->drawing->id}"
                ."/revisions/{$otherRevision->id}"
                .'/archive',
            );

        $response->assertNotFound();

        $this->assertNull(
            $otherRevision->fresh()->archived_at,
        );
    }

    private function createRevision(
        string $code,
        bool $archived = false,
    ): DrawingRevision {
        return $this->createRevisionForDrawing(
            $this->drawing,
            $code,
            $archived,
        );
    }

    private function createRevisionForDrawing(
        Drawing $drawing,
        string $code,
        bool $archived = false,
    ): DrawingRevision {
        $filePath =
            "drawings/{$drawing->id}/revisions/"
            ."test-revision-{$code}.pdf";

        Storage::disk('local')->put(
            $filePath,
            'Fake PDF content for automated testing.',
        );

        return DrawingRevision::create([
            'drawing_id' => $drawing->id,
            'uploaded_by' => $this->user->id,
            'revision_code' => $code,
            'file_path' => $filePath,
            'original_filename' => "revision-{$code}.pdf",
            'mime_type' => 'application/pdf',
            'file_extension' => 'pdf',
            'file_size' => 39,
            'revision_notes' => "Automated test revision {$code}.",
            'issued_at' => now()->toDateString(),
            'archived_at' => $archived ? now() : null,
        ]);
    }

    private function revisionStoreUrl(): string
    {
        return "/projects/{$this->project->id}"
            ."/drawings/{$this->drawing->id}"
            .'/revisions';
    }

    private function revisionUrl(
        DrawingRevision $revision,
    ): string {
        return $this->revisionStoreUrl()
            ."/{$revision->id}";
    }

    private function revisionActionUrl(
        DrawingRevision $revision,
        string $action,
    ): string {
        return $this->revisionUrl($revision)
            ."/{$action}";
    }
}
