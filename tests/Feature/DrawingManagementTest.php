<?php

namespace Tests\Feature;

use App\Models\Drawing;
use App\Models\DrawingRevision;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DrawingManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Project $project;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        $this->user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $this->project = $this->createProject(
            code: 'TEST-001',
            name: 'Automated Test Project',
        );
    }

    public function test_guest_cannot_register_a_drawing(): void
    {
        $response = $this->post(
            $this->drawingStoreUrl(),
            $this->validDrawingData(),
        );

        $response->assertRedirect('/login');

        $this->assertDatabaseCount(
            'drawings',
            0,
        );
    }

    public function test_authenticated_user_can_register_a_drawing(): void
    {
        $response = $this
            ->actingAs($this->user)
            ->post(
                $this->drawingStoreUrl(),
                $this->validDrawingData(),
            );

        $response->assertRedirect();

        $this->assertDatabaseHas(
            'drawings',
            [
                'project_id' => $this->project->id,
                'drawing_number' => 'M-001',
                'title' => 'Main Conveyor Layout',
                'discipline' => 'mechanical',
                'status' => 'active',
                'created_by' => $this->user->id,
            ],
        );
    }

    public function test_drawing_number_and_title_are_required(): void
    {
        $response = $this
            ->actingAs($this->user)
            ->post(
                $this->drawingStoreUrl(),
                [
                    'drawing_number' => '',
                    'title' => '',
                    'discipline' => 'mechanical',
                    'status' => 'active',
                    'description' => null,
                ],
            );

        $response->assertSessionHasErrors([
            'drawing_number',
            'title',
        ]);

        $this->assertDatabaseCount(
            'drawings',
            0,
        );
    }

    public function test_drawing_number_must_be_unique_inside_a_project(): void
    {
        $this->createDrawing(
            project: $this->project,
            number: 'M-001',
        );

        $response = $this
            ->actingAs($this->user)
            ->post(
                $this->drawingStoreUrl(),
                $this->validDrawingData(),
            );

        $response->assertSessionHasErrors(
            'drawing_number',
        );

        $this->assertSame(
            1,
            Drawing::query()
                ->where(
                    'project_id',
                    $this->project->id,
                )
                ->where(
                    'drawing_number',
                    'M-001',
                )
                ->count(),
        );
    }

    public function test_same_drawing_number_can_exist_in_different_projects(): void
    {
        $this->createDrawing(
            project: $this->project,
            number: 'M-001',
        );

        $secondProject = $this->createProject(
            code: 'TEST-002',
            name: 'Second Test Project',
        );

        $response = $this
            ->actingAs($this->user)
            ->post(
                "/projects/{$secondProject->id}/drawings",
                $this->validDrawingData(),
            );

        $response->assertRedirect();

        $this->assertDatabaseHas(
            'drawings',
            [
                'project_id' => $this->project->id,
                'drawing_number' => 'M-001',
            ],
        );

        $this->assertDatabaseHas(
            'drawings',
            [
                'project_id' => $secondProject->id,
                'drawing_number' => 'M-001',
            ],
        );
    }

    public function test_authenticated_user_can_update_drawing_metadata(): void
    {
        $drawing = $this->createDrawing();

        $response = $this
            ->actingAs($this->user)
            ->patch(
                $this->drawingUrl($drawing),
                [
                    'drawing_number' => 'M-001-UPDATED',
                    'title' => 'Updated Conveyor Layout',
                    'discipline' => 'mechanical',
                    'status' => 'approved',
                    'description' => 'Updated through an automated test.',
                ],
            );

        $response->assertRedirect();

        $this->assertDatabaseHas(
            'drawings',
            [
                'id' => $drawing->id,
                'drawing_number' => 'M-001-UPDATED',
                'title' => 'Updated Conveyor Layout',
                'status' => 'approved',
                'description' => 'Updated through an automated test.',
            ],
        );
    }

    public function test_drawing_cannot_be_updated_through_another_project(): void
    {
        $secondProject = $this->createProject(
            code: 'TEST-002',
            name: 'Second Test Project',
        );

        $drawing = $this->createDrawing(
            project: $secondProject,
            number: 'E-001',
        );

        /*
         * The URL intentionally contains the first project,
         * but the drawing belongs to the second project.
         */
        $response = $this
            ->actingAs($this->user)
            ->patch(
                "/projects/{$this->project->id}"
                ."/drawings/{$drawing->id}",
                [
                    'drawing_number' => 'HACKED-001',
                    'title' => 'Invalid Update',
                    'discipline' => 'electrical',
                    'status' => 'active',
                    'description' => 'This update must not be accepted.',
                ],
            );

        $response->assertNotFound();

        $this->assertSame(
            'E-001',
            $drawing->fresh()->drawing_number,
        );

        $this->assertNotSame(
            'Invalid Update',
            $drawing->fresh()->title,
        );
    }

    public function test_drawing_can_be_soft_deleted(): void
    {
        $drawing = $this->createDrawing();

        $response = $this
            ->actingAs($this->user)
            ->delete(
                $this->drawingUrl($drawing),
            );

        $response->assertRedirect();

        $this->assertSoftDeleted(
            $drawing,
        );

        $this->assertNull(
            Drawing::query()->find($drawing->id),
        );

        $this->assertNotNull(
            Drawing::withTrashed()
                ->find($drawing->id),
        );
    }

    public function test_soft_deleting_a_drawing_does_not_permanently_delete_its_revisions(): void
    {
        $drawing = $this->createDrawing();

        $revision = $this->createRevision(
            drawing: $drawing,
            code: '0',
        );

        $drawing->update([
            'current_revision_id' => $revision->id,
        ]);

        $response = $this
            ->actingAs($this->user)
            ->delete(
                $this->drawingUrl($drawing),
            );

        $response->assertRedirect();

        $this->assertSoftDeleted(
            $drawing,
        );

        $this->assertDatabaseHas(
            'drawing_revisions',
            [
                'id' => $revision->id,
                'drawing_id' => $drawing->id,
            ],
        );

        Storage::disk('local')->assertExists(
            $revision->file_path,
        );
    }

    public function test_deleted_drawing_can_be_restored(): void
    {
        $drawing = $this->createDrawing();

        $drawing->delete();

        $this->assertSoftDeleted(
            $drawing,
        );

        $response = $this
            ->actingAs($this->user)
            ->patch(
                $this->drawingRestoreUrl(
                    $drawing,
                ),
            );

        $response->assertRedirect();

        $this->assertNotSoftDeleted(
            $drawing->fresh(),
        );

        $this->assertDatabaseHas(
            'drawings',
            [
                'id' => $drawing->id,
                'deleted_at' => null,
            ],
        );
    }

    public function test_guest_cannot_restore_a_deleted_drawing(): void
    {
        $drawing = $this->createDrawing();

        $drawing->delete();

        $response = $this->patch(
            $this->drawingRestoreUrl($drawing),
        );

        $response->assertRedirect('/login');

        $this->assertSoftDeleted(
            $drawing,
        );
    }

    public function test_drawing_show_page_requires_authentication(): void
    {
        $drawing = $this->createDrawing();

        $response = $this->get(
            $this->drawingUrl($drawing),
        );

        $response->assertRedirect('/login');
    }

    public function test_authenticated_user_can_open_a_drawing(): void
    {
        $drawing = $this->createDrawing();

        $response = $this
            ->actingAs($this->user)
            ->get(
                $this->drawingUrl($drawing),
            );

        $response->assertOk();
    }

    private function createProject(
        string $code,
        string $name,
    ): Project {
        return Project::create([
            'project_code' => $code,
            'name' => $name,
            'description' => 'Project created by automated tests.',
            'status' => 'active',
            'start_date' => now()->toDateString(),
            'end_date' => null,
            'created_by' => $this->user->id,
        ]);
    }

    private function createDrawing(
        ?Project $project = null,
        string $number = 'M-001',
    ): Drawing {
        $project ??= $this->project;

        return Drawing::create([
            'project_id' => $project->id,
            'drawing_number' => $number,
            'title' => 'Main Conveyor Layout',
            'discipline' => 'mechanical',
            'status' => 'active',
            'description' => 'Drawing created by automated tests.',
            'created_by' => $this->user->id,
        ]);
    }

    private function createRevision(
        Drawing $drawing,
        string $code,
    ): DrawingRevision {
        $filePath =
            "drawings/{$drawing->id}/revisions/"
            ."revision-{$code}.pdf";

        Storage::disk('local')->put(
            $filePath,
            'Fake PDF content.',
        );

        return DrawingRevision::create([
            'drawing_id' => $drawing->id,
            'uploaded_by' => $this->user->id,
            'revision_code' => $code,
            'file_path' => $filePath,
            'original_filename' => "revision-{$code}.pdf",
            'mime_type' => 'application/pdf',
            'file_extension' => 'pdf',
            'file_size' => 17,
            'revision_notes' => "Revision {$code}.",
            'issued_at' => now()->toDateString(),
            'archived_at' => null,
        ]);
    }

    private function validDrawingData(): array
    {
        return [
            'drawing_number' => 'M-001',
            'title' => 'Main Conveyor Layout',
            'discipline' => 'mechanical',
            'status' => 'active',
            'description' => 'Main conveyor arrangement drawing.',
        ];
    }

    private function drawingStoreUrl(): string
    {
        return "/projects/{$this->project->id}"
            .'/drawings';
    }

    private function drawingUrl(
        Drawing $drawing,
    ): string {
        return "/projects/{$this->project->id}"
            ."/drawings/{$drawing->id}";
    }

    private function drawingRestoreUrl(
        Drawing $drawing,
    ): string {
        return "/trash/drawings/{$drawing->id}"
            .'/restore';
    }
}
