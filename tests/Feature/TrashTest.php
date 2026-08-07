<?php

namespace Tests\Feature;

use App\Models\Drawing;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TrashTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'email_verified_at' => now(),
        ]);
    }

    public function test_guest_cannot_open_the_trash_page(): void
    {
        $response = $this->get('/trash');

        $response->assertRedirect('/login');
    }

    public function test_authenticated_user_can_open_the_trash_page(): void
    {
        $response = $this
            ->actingAs($this->user)
            ->get('/trash');

        $response->assertOk();

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('trash/index')
                ->has('projects')
                ->has('drawings'),
        );
    }

    public function test_only_deleted_projects_are_displayed_in_trash(): void
    {
        $activeProject = $this->createProject(
            code: 'ACTIVE-001',
            name: 'Active Project',
        );

        $deletedProject = $this->createProject(
            code: 'DELETED-001',
            name: 'Deleted Project',
        );

        $deletedProject->delete();

        $response = $this
            ->actingAs($this->user)
            ->get('/trash');

        $response->assertOk();

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('trash/index')
                ->has('projects', 1)
                ->where(
                    'projects.0.id',
                    $deletedProject->id,
                )
                ->where(
                    'projects.0.project_code',
                    'DELETED-001',
                ),
        );

        $this->assertNotSoftDeleted(
            'projects',
            [
                'id' => $activeProject->id,
            ],
        );

        $this->assertSoftDeleted(
            'projects',
            [
                'id' => $deletedProject->id,
            ],
        );
    }

    public function test_only_deleted_drawings_are_displayed_in_trash(): void
    {
        $project = $this->createProject();

        $activeDrawing = $this->createDrawing(
            project: $project,
            number: 'M-001',
            title: 'Active Drawing',
        );

        $deletedDrawing = $this->createDrawing(
            project: $project,
            number: 'M-002',
            title: 'Deleted Drawing',
        );

        $deletedDrawing->delete();

        $response = $this
            ->actingAs($this->user)
            ->get('/trash');

        $response->assertOk();

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('trash/index')
                ->has('drawings', 1)
                ->where(
                    'drawings.0.id',
                    $deletedDrawing->id,
                )
                ->where(
                    'drawings.0.drawing_number',
                    'M-002',
                ),
        );

        $this->assertNotSoftDeleted(
            'drawings',
            [
                'id' => $activeDrawing->id,
            ],
        );

        $this->assertSoftDeleted(
            'drawings',
            [
                'id' => $deletedDrawing->id,
            ],
        );
    }

    public function test_deleted_drawing_includes_parent_project_information(): void
    {
        $project = $this->createProject(
            code: 'ASRS-001',
            name: 'ASRS Warehouse Upgrade',
        );

        $drawing = $this->createDrawing(
            project: $project,
            number: 'M-001',
            title: 'Main Conveyor Layout',
        );

        $drawing->delete();

        $response = $this
            ->actingAs($this->user)
            ->get('/trash');

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('trash/index')
                ->where(
                    'drawings.0.id',
                    $drawing->id,
                )
                ->where(
                    'drawings.0.project_code',
                    'ASRS-001',
                )
                ->where(
                    'drawings.0.project_name',
                    'ASRS Warehouse Upgrade',
                ),
        );
    }

    public function test_guest_cannot_restore_a_deleted_project(): void
    {
        $project = $this->createProject();

        $project->delete();

        $response = $this->patch(
            $this->projectRestoreUrl($project),
        );

        $response->assertRedirect('/login');

        $this->assertSoftDeleted(
            'projects',
            [
                'id' => $project->id,
            ],
        );
    }

    public function test_guest_cannot_restore_a_deleted_drawing(): void
    {
        $project = $this->createProject();

        $drawing = $this->createDrawing(
            project: $project,
        );

        $drawing->delete();

        $response = $this->patch(
            $this->drawingRestoreUrl($drawing),
        );

        $response->assertRedirect('/login');

        $this->assertSoftDeleted(
            'drawings',
            [
                'id' => $drawing->id,
            ],
        );
    }

    public function test_deleted_project_can_be_restored(): void
    {
        $project = $this->createProject();

        $project->delete();

        $this->assertSoftDeleted(
            'projects',
            [
                'id' => $project->id,
            ],
        );

        $response = $this
            ->actingAs($this->user)
            ->patch(
                $this->projectRestoreUrl($project),
            );

        $response->assertRedirect();

        $this->assertNotSoftDeleted(
            'projects',
            [
                'id' => $project->id,
            ],
        );
    }

    public function test_deleted_drawing_can_be_restored_when_parent_project_is_active(): void
    {
        $project = $this->createProject();

        $drawing = $this->createDrawing(
            project: $project,
        );

        $drawing->delete();

        $response = $this
            ->actingAs($this->user)
            ->patch(
                $this->drawingRestoreUrl($drawing),
            );

        $response->assertRedirect();

        $this->assertNotSoftDeleted(
            'drawings',
            [
                'id' => $drawing->id,
            ],
        );

        $this->assertNotSoftDeleted(
            'projects',
            [
                'id' => $project->id,
            ],
        );
    }

    public function test_drawing_cannot_be_restored_while_parent_project_is_deleted(): void
    {
        $project = $this->createProject();

        $drawing = $this->createDrawing(
            project: $project,
        );

        /*
         * The drawing was independently deleted before
         * the whole project was moved to Trash.
         */
        $drawing->delete();
        $project->delete();

        $response = $this
            ->actingAs($this->user)
            ->patch(
                $this->drawingRestoreUrl($drawing),
            );

        $response->assertRedirect();

        /*
         * Restoration must be blocked until the parent
         * project has been restored.
         */
        $this->assertSoftDeleted(
            'drawings',
            [
                'id' => $drawing->id,
            ],
        );

        $this->assertSoftDeleted(
            'projects',
            [
                'id' => $project->id,
            ],
        );
    }

    public function test_drawing_can_be_restored_after_parent_project_is_restored(): void
    {
        $project = $this->createProject();

        $drawing = $this->createDrawing(
            project: $project,
        );

        $drawing->delete();
        $project->delete();

        $this
            ->actingAs($this->user)
            ->patch(
                $this->projectRestoreUrl($project),
            )
            ->assertRedirect();

        $this->assertNotSoftDeleted(
            'projects',
            [
                'id' => $project->id,
            ],
        );

        /*
         * Restoring the parent does not automatically
         * restore a drawing that had been independently
         * deleted.
         */
        $this->assertSoftDeleted(
            'drawings',
            [
                'id' => $drawing->id,
            ],
        );

        $this
            ->actingAs($this->user)
            ->patch(
                $this->drawingRestoreUrl($drawing),
            )
            ->assertRedirect();

        $this->assertNotSoftDeleted(
            'drawings',
            [
                'id' => $drawing->id,
            ],
        );
    }

    public function test_restored_project_disappears_from_trash(): void
    {
        $project = $this->createProject();

        $project->delete();

        $this
            ->actingAs($this->user)
            ->patch(
                $this->projectRestoreUrl($project),
            )
            ->assertRedirect();

        $response = $this
            ->actingAs($this->user)
            ->get('/trash');

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('trash/index')
                ->has('projects', 0),
        );
    }

    public function test_restored_drawing_disappears_from_trash(): void
    {
        $project = $this->createProject();

        $drawing = $this->createDrawing(
            project: $project,
        );

        $drawing->delete();

        $this
            ->actingAs($this->user)
            ->patch(
                $this->drawingRestoreUrl($drawing),
            )
            ->assertRedirect();

        $response = $this
            ->actingAs($this->user)
            ->get('/trash');

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('trash/index')
                ->has('drawings', 0),
        );
    }

    public function test_active_project_cannot_be_restored_through_trash_route(): void
    {
        $project = $this->createProject();

        $response = $this
            ->actingAs($this->user)
            ->patch(
                $this->projectRestoreUrl($project),
            );

        $response->assertNotFound();

        $this->assertNotSoftDeleted(
            'projects',
            [
                'id' => $project->id,
            ],
        );
    }

    public function test_active_drawing_cannot_be_restored_through_trash_route(): void
    {
        $project = $this->createProject();

        $drawing = $this->createDrawing(
            project: $project,
        );

        $response = $this
            ->actingAs($this->user)
            ->patch(
                $this->drawingRestoreUrl($drawing),
            );

        $response->assertNotFound();

        $this->assertNotSoftDeleted(
            'drawings',
            [
                'id' => $drawing->id,
            ],
        );
    }

    private function createProject(
        string $code = 'ASRS-2026',
        string $name = 'ASRS Warehouse Upgrade',
    ): Project {
        return Project::create([
            'project_code' => $code,
            'name' => $name,

            'description' => 'Project created by automated tests.',

            'status' => 'active',

            'start_date' => '2026-08-01',

            'end_date' => '2026-12-31',

            'created_by' => $this->user->id,
        ]);
    }

    private function createDrawing(
        Project $project,
        string $number = 'M-001',
        string $title = 'Main Conveyor Layout',
    ): Drawing {
        return Drawing::create([
            'project_id' => $project->id,
            'drawing_number' => $number,
            'title' => $title,
            'discipline' => 'mechanical',
            'status' => 'active',

            'description' => 'Drawing created by automated tests.',

            'created_by' => $this->user->id,
        ]);
    }

    private function projectRestoreUrl(
        Project $project,
    ): string {
        return "/trash/projects/{$project->id}"
            .'/restore';
    }

    private function drawingRestoreUrl(
        Drawing $drawing,
    ): string {
        return "/trash/drawings/{$drawing->id}"
            .'/restore';
    }

    public function test_deleted_project_can_be_permanently_deleted(): void
    {
        $project = $this->createProject();

        $drawing = $this->createDrawing(
            project: $project,
        );

        $project->delete();

        $this->actingAs($this->user)
            ->delete(
                "/trash/projects/{$project->id}/permanent",
            )
            ->assertRedirect();

        $this->assertDatabaseMissing(
            'projects',
            [
                'id' => $project->id,
            ],
        );

        $this->assertDatabaseMissing(
            'drawings',
            [
                'id' => $drawing->id,
            ],
        );
    }
}
