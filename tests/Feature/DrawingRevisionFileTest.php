<?php

namespace Tests\Feature;

use App\Models\Drawing;
use App\Models\DrawingRevision;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DrawingRevisionFileTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Project $project;

    private Drawing $drawing;

    protected function setUp(): void
    {
        parent::setUp();

        /*
         * No test file is written into your real
         * storage/app directory.
         */
        Storage::fake('local');

        $this->user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $this->project = Project::create([
            'project_code' => 'FILE-TEST-001',
            'name' => 'Revision File Test Project',
            'description' =>
                'Project used for private-file tests.',
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
            'description' =>
                'Drawing used for private-file tests.',
            'created_by' => $this->user->id,
        ]);
    }

    public function test_guest_cannot_preview_a_revision_file(): void
    {
        $revision = $this->createPdfRevision('A');

        $response = $this->get(
            $this->previewUrl($revision),
        );

        $response->assertRedirect('/login');
    }

    public function test_guest_cannot_download_a_revision_file(): void
    {
        $revision = $this->createPdfRevision('A');

        $response = $this->get(
            $this->downloadUrl($revision),
        );

        $response->assertRedirect('/login');
    }

    public function test_authenticated_user_can_preview_a_pdf_revision(): void
    {
        $revision = $this->createPdfRevision('A');

        $response = $this
            ->actingAs($this->user)
            ->get(
                $this->previewUrl($revision),
            );

        $response->assertOk();

        $response->assertHeader(
            'content-type',
            'application/pdf',
        );

        /*
         * response()->file() normally returns an inline
         * content disposition for browser viewing.
         */
        $contentDisposition =
            (string) $response->headers->get(
                'content-disposition',
            );

        $this->assertStringContainsString(
            'inline',
            strtolower($contentDisposition),
        );
    }

    public function test_authenticated_user_can_download_a_revision(): void
    {
        $revision = $this->createPdfRevision('B');

        $response = $this
            ->actingAs($this->user)
            ->get(
                $this->downloadUrl($revision),
            );

        $response->assertOk();

        $response->assertDownload(
            'revision-B.pdf',
        );
    }

    public function test_download_does_not_delete_the_stored_file(): void
    {
        $revision = $this->createPdfRevision('C');

        $this
            ->actingAs($this->user)
            ->get(
                $this->downloadUrl($revision),
            )
            ->assertOk();

        Storage::disk('local')->assertExists(
            $revision->file_path,
        );

        $this->assertDatabaseHas(
            'drawing_revisions',
            [
                'id' => $revision->id,
            ],
        );
    }

    public function test_archived_revision_can_still_be_downloaded(): void
    {
        $revision = $this->createPdfRevision(
            code: '0',
            archived: true,
        );

        $response = $this
            ->actingAs($this->user)
            ->get(
                $this->downloadUrl($revision),
            );

        $response->assertOk();

        $response->assertDownload(
            'revision-0.pdf',
        );

        /*
         * Archived means hidden from normal viewing,
         * not destroyed.
         */
        Storage::disk('local')->assertExists(
            $revision->file_path,
        );

        $this->assertNotNull(
            $revision->fresh()->archived_at,
        );
    }

    public function test_archived_pdf_revision_can_still_be_previewed_from_full_history(): void
    {
        $revision = $this->createPdfRevision(
            code: '0',
            archived: true,
        );

        $response = $this
            ->actingAs($this->user)
            ->get(
                $this->previewUrl($revision),
            );

        $response->assertOk();

        $response->assertHeader(
            'content-type',
            'application/pdf',
        );
    }

    public function test_preview_returns_not_found_when_the_file_is_missing(): void
    {
        $revision = $this->createPdfRevision('A');

        Storage::disk('local')->delete(
            $revision->file_path,
        );

        Storage::disk('local')->assertMissing(
            $revision->file_path,
        );

        $response = $this
            ->actingAs($this->user)
            ->get(
                $this->previewUrl($revision),
            );

        $response->assertNotFound();

        /*
         * A missing physical file must not silently
         * remove the database record.
         */
        $this->assertDatabaseHas(
            'drawing_revisions',
            [
                'id' => $revision->id,
            ],
        );
    }

    public function test_download_returns_not_found_when_the_file_is_missing(): void
    {
        $revision = $this->createPdfRevision('A');

        Storage::disk('local')->delete(
            $revision->file_path,
        );

        $response = $this
            ->actingAs($this->user)
            ->get(
                $this->downloadUrl($revision),
            );

        $response->assertNotFound();
    }

    public function test_revision_from_another_drawing_cannot_be_previewed(): void
    {
        $otherDrawing = $this->createDrawing(
            project: $this->project,
            number: 'E-001',
            title: 'Electrical Layout',
        );

        $otherRevision =
            $this->createPdfRevisionForDrawing(
                drawing: $otherDrawing,
                code: 'A',
            );

        /*
         * The URL deliberately contains M-001's drawing
         * ID, while the revision belongs to E-001.
         */
        $response = $this
            ->actingAs($this->user)
            ->get(
                "/projects/{$this->project->id}"
                ."/drawings/{$this->drawing->id}"
                ."/revisions/{$otherRevision->id}"
                .'/preview',
            );

        $response->assertNotFound();
    }

    public function test_revision_from_another_drawing_cannot_be_downloaded(): void
    {
        $otherDrawing = $this->createDrawing(
            project: $this->project,
            number: 'E-001',
            title: 'Electrical Layout',
        );

        $otherRevision =
            $this->createPdfRevisionForDrawing(
                drawing: $otherDrawing,
                code: 'A',
            );

        $response = $this
            ->actingAs($this->user)
            ->get(
                "/projects/{$this->project->id}"
                ."/drawings/{$this->drawing->id}"
                ."/revisions/{$otherRevision->id}"
                .'/download',
            );

        $response->assertNotFound();
    }

    public function test_drawing_from_another_project_cannot_be_used_to_access_a_revision(): void
    {
        $otherProject = Project::create([
            'project_code' => 'FILE-TEST-002',
            'name' => 'Second File Test Project',
            'description' => null,
            'status' => 'active',
            'start_date' => now()->toDateString(),
            'end_date' => null,
            'created_by' => $this->user->id,
        ]);

        $otherDrawing = $this->createDrawing(
            project: $otherProject,
            number: 'C-001',
            title: 'Control Panel Arrangement',
        );

        $otherRevision =
            $this->createPdfRevisionForDrawing(
                drawing: $otherDrawing,
                code: '0',
            );

        /*
         * The project ID is deliberately incorrect.
         */
        $response = $this
            ->actingAs($this->user)
            ->get(
                "/projects/{$this->project->id}"
                ."/drawings/{$otherDrawing->id}"
                ."/revisions/{$otherRevision->id}"
                .'/download',
            );

        $response->assertNotFound();
    }

    public function test_non_pdf_revision_can_be_downloaded(): void
    {
        $revision = $this->createRevision(
            code: 'A',
            extension: 'dwg',
            mimeType: 'application/octet-stream',
            originalFilename: 'layout-A.dwg',
        );

        $response = $this
            ->actingAs($this->user)
            ->get(
                $this->downloadUrl($revision),
            );

        $response->assertOk();

        $response->assertDownload(
            'layout-A.dwg',
        );
    }

    public function test_non_pdf_revision_cannot_use_the_pdf_preview_route(): void
    {
        $revision = $this->createRevision(
            code: 'A',
            extension: 'dwg',
            mimeType: 'application/octet-stream',
            originalFilename: 'layout-A.dwg',
        );

        $response = $this
            ->actingAs($this->user)
            ->get(
                $this->previewUrl($revision),
            );

        /*
         * Use assertNotFound when your controller aborts
         * with 404 for unsupported preview types.
         */
        $response->assertNotFound();
    }

    private function createPdfRevision(
        string $code,
        bool $archived = false,
    ): DrawingRevision {
        return $this->createRevision(
            code: $code,
            extension: 'pdf',
            mimeType: 'application/pdf',
            originalFilename:
                "revision-{$code}.pdf",
            archived: $archived,
        );
    }

    private function createPdfRevisionForDrawing(
        Drawing $drawing,
        string $code,
    ): DrawingRevision {
        return $this->createRevision(
            code: $code,
            extension: 'pdf',
            mimeType: 'application/pdf',
            originalFilename:
                "revision-{$code}.pdf",
            drawing: $drawing,
        );
    }

    private function createRevision(
        string $code,
        string $extension,
        string $mimeType,
        string $originalFilename,
        bool $archived = false,
        ?Drawing $drawing = null,
    ): DrawingRevision {
        $drawing ??= $this->drawing;

        $filePath =
            "drawings/{$drawing->id}/revisions/"
            ."test-{$code}.{$extension}";

        $contents = $extension === 'pdf'
            ? "%PDF-1.4\nFake PDF test file\n%%EOF"
            : 'Fake DWG test file content';

        Storage::disk('local')->put(
            $filePath,
            $contents,
        );

        return DrawingRevision::create([
            'drawing_id' => $drawing->id,
            'uploaded_by' => $this->user->id,
            'revision_code' => $code,
            'file_path' => $filePath,
            'original_filename' =>
                $originalFilename,
            'mime_type' => $mimeType,
            'file_extension' => $extension,
            'file_size' => strlen($contents),
            'revision_notes' =>
                "Revision {$code} test file.",
            'issued_at' => now()->toDateString(),
            'archived_at' =>
                $archived ? now() : null,
        ]);
    }

    private function createDrawing(
        Project $project,
        string $number,
        string $title,
    ): Drawing {
        return Drawing::create([
            'project_id' => $project->id,
            'drawing_number' => $number,
            'title' => $title,
            'discipline' => 'mechanical',
            'status' => 'active',
            'description' => null,
            'created_by' => $this->user->id,
        ]);
    }

    private function revisionBaseUrl(
        DrawingRevision $revision,
    ): string {
        return "/projects/{$this->project->id}"
            ."/drawings/{$this->drawing->id}"
            ."/revisions/{$revision->id}";
    }

    private function previewUrl(
        DrawingRevision $revision,
    ): string {
        return $this->revisionBaseUrl(
            $revision,
        ).'/preview';
    }

    private function downloadUrl(
        DrawingRevision $revision,
    ): string {
        return $this->revisionBaseUrl(
            $revision,
        ).'/download';
    }
}