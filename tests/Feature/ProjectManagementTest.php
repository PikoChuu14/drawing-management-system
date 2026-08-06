<?php

namespace Tests\Feature;

use App\Models\Drawing;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectManagementTest extends TestCase
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

    public function test_guest_cannot_create_a_project(): void
    {
        $response = $this->post(
            '/projects',
            $this->validProjectData(),
        );

        $response->assertRedirect('/login');

        $this->assertDatabaseCount(
            'projects',
            0,
        );
    }

    public function test_authenticated_user_can_create_a_project(): void
    {
        $response = $this
            ->actingAs($this->user)
            ->post(
                '/projects',
                $this->validProjectData(),
            );

        $response->assertRedirect();

        $this->assertDatabaseHas(
            'projects',
            [
                'project_code' => 'ASRS-2026',
                'name' => 'ASRS Warehouse Upgrade',
                'status' => 'active',
                'created_by' => $this->user->id,
            ],
        );
    }

    public function test_project_code_and_name_are_required(): void
    {
        $response = $this
            ->actingAs($this->user)
            ->post(
                '/projects',
                [
                    'project_code' => '',
                    'name' => '',
                    'description' => null,
                    'status' => 'active',
                    'start_date' => null,
                    'end_date' => null,
                ],
            );

        $response->assertSessionHasErrors([
            'project_code',
            'name',
        ]);

        $this->assertDatabaseCount(
            'projects',
            0,
        );
    }

    public function test_project_code_must_be_unique(): void
    {
        $this->createProject(
            code: 'ASRS-2026',
        );

        $response = $this
            ->actingAs($this->user)
            ->post(
                '/projects',
                $this->validProjectData(),
            );

        $response->assertSessionHasErrors(
            'project_code',
        );

        $this->assertSame(
            1,
            Project::query()
                ->where(
                    'project_code',
                    'ASRS-2026',
                )
                ->count(),
        );
    }

    public function test_project_can_be_updated_without_changing_its_code(): void
    {
        $project = $this->createProject();

        $response = $this
            ->actingAs($this->user)
            ->patch(
                $this->projectUrl($project),
                [
                    'project_code' => $project->project_code,

                    'name' => 'Updated ASRS Warehouse Upgrade',

                    'description' => 'Updated through automated testing.',

                    'status' => 'active',

                    'start_date' => '2026-08-01',

                    'end_date' => '2026-12-31',
                ],
            );

        $response->assertRedirect();

        $this->assertDatabaseHas(
            'projects',
            [
                'id' => $project->id,

                'project_code' => $project->project_code,

                'name' => 'Updated ASRS Warehouse Upgrade',

                'description' => 'Updated through automated testing.',

                'end_date' => '2026-12-31',
            ],
        );
    }

    public function test_project_code_cannot_be_changed_to_an_existing_code(): void
    {
        $firstProject = $this->createProject(
            code: 'ASRS-001',
        );

        $secondProject = $this->createProject(
            code: 'ASRS-002',
        );

        $response = $this
            ->actingAs($this->user)
            ->patch(
                $this->projectUrl(
                    $secondProject,
                ),
                [
                    'project_code' => $firstProject->project_code,

                    'name' => $secondProject->name,

                    'description' => $secondProject->description,

                    'status' => $secondProject->status,

                    'start_date' => $secondProject->start_date
                        ?->format('Y-m-d'),

                    'end_date' => $secondProject->end_date
                        ?->format('Y-m-d'),
                ],
            );

        $response->assertSessionHasErrors(
            'project_code',
        );

        $this->assertSame(
            'ASRS-002',
            $secondProject
                ->fresh()
                ->project_code,
        );
    }

    public function test_project_can_be_soft_deleted(): void
    {
        $project = $this->createProject();

        $response = $this
            ->actingAs($this->user)
            ->delete(
                $this->projectUrl($project),
            );

        $response->assertRedirect();

        $this->assertSoftDeleted(
            'projects',
            [
                'id' => $project->id,
            ],
        );

        $this->assertNull(
            Project::query()->find(
                $project->id,
            ),
        );

        $this->assertNotNull(
            Project::withTrashed()->find(
                $project->id,
            ),
        );
    }

    public function test_soft_deleting_a_project_does_not_permanently_delete_its_drawings(): void
    {
        $project = $this->createProject();

        $drawing = $this->createDrawing(
            $project,
        );

        $response = $this
            ->actingAs($this->user)
            ->delete(
                $this->projectUrl($project),
            );

        $response->assertRedirect();

        $this->assertSoftDeleted(
            'projects',
            [
                'id' => $project->id,
            ],
        );

        /*
         * The child drawing remains stored so restoring
         * the project restores access to its register.
         */
        $this->assertDatabaseHas(
            'drawings',
            [
                'id' => $drawing->id,
                'project_id' => $project->id,
                'drawing_number' => 'M-001',
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
                $this->projectRestoreUrl(
                    $project,
                ),
            );

        $response->assertRedirect();

        $this->assertNotSoftDeleted(
            'projects',
            [
                'id' => $project->id,
            ],
        );

        $this->assertDatabaseHas(
            'projects',
            [
                'id' => $project->id,
                'deleted_at' => null,
            ],
        );
    }

    public function test_restoring_a_project_restores_access_to_its_drawings(): void
    {
        $project = $this->createProject();

        $drawing = $this->createDrawing(
            $project,
        );

        $project->delete();

        $this
            ->actingAs($this->user)
            ->patch(
                $this->projectRestoreUrl(
                    $project,
                ),
            )
            ->assertRedirect();

        $response = $this
            ->actingAs($this->user)
            ->get(
                "/projects/{$project->id}"
                ."/drawings/{$drawing->id}",
            );

        $response->assertOk();
    }

    public function test_guest_cannot_restore_a_deleted_project(): void
    {
        $project = $this->createProject();

        $project->delete();

        $response = $this->patch(
            $this->projectRestoreUrl(
                $project,
            ),
        );

        $response->assertRedirect('/login');

        $this->assertSoftDeleted(
            'projects',
            [
                'id' => $project->id,
            ],
        );
    }

    public function test_project_page_requires_authentication(): void
    {
        $project = $this->createProject();

        $response = $this->get(
            $this->projectUrl($project),
        );

        $response->assertRedirect('/login');
    }

    public function test_authenticated_user_can_open_a_project(): void
    {
        $project = $this->createProject();

        $response = $this
            ->actingAs($this->user)
            ->get(
                $this->projectUrl($project),
            );

        $response->assertOk();
    }

    public function test_deleted_project_cannot_be_opened_normally(): void
    {
        $project = $this->createProject();

        $project->delete();

        $response = $this
            ->actingAs($this->user)
            ->get(
                $this->projectUrl($project),
            );

        $response->assertNotFound();
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
    ): Drawing {
        return Drawing::create([
            'project_id' => $project->id,

            'drawing_number' => 'M-001',

            'title' => 'Main Conveyor Layout',

            'discipline' => 'mechanical',

            'status' => 'active',

            'description' => 'Drawing belonging to the test project.',

            'created_by' => $this->user->id,
        ]);
    }

    private function validProjectData(): array
    {
        return [
            'project_code' => 'ASRS-2026',

            'name' => 'ASRS Warehouse Upgrade',

            'description' => 'Automated storage and retrieval '
                .'system upgrade project.',

            'status' => 'active',

            'start_date' => '2026-08-01',

            'end_date' => '2026-12-31',
        ];
    }

    private function projectUrl(
        Project $project,
    ): string {
        return "/projects/{$project->id}";
    }

    private function projectRestoreUrl(
        Project $project,
    ): string {
        return "/trash/projects/{$project->id}"
            .'/restore';
    }
}
