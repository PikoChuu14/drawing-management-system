<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ArchivedTest extends TestCase
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

    public function test_guest_cannot_open_the_archived_page(): void
    {
        $response = $this->get('/archived');

        $response->assertRedirect('/login');
    }

    public function test_archived_projects_are_hidden_from_the_active_projects_page(): void
    {
        $activeProject = $this->createProject(
            code: 'ACTIVE-001',
            status: 'active',
        );

        $archivedProject = $this->createProject(
            code: 'ARCH-001',
            status: 'archived',
        );

        $response = $this
            ->actingAs($this->user)
            ->get('/projects');

        $response->assertOk();

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('projects/index')
                ->has('projects', 1)
                ->where('projects.0.id', $activeProject->id)
                ->missing('projects.1'),
        );

        $this->assertDatabaseHas(
            'projects',
            [
                'id' => $archivedProject->id,
                'status' => 'archived',
            ],
        );
    }

    public function test_authenticated_user_can_open_the_archived_page(): void
    {
        $archivedProject = $this->createProject(
            code: 'ARCH-001',
            status: 'archived',
        );

        $response = $this
            ->actingAs($this->user)
            ->get('/archived');

        $response->assertOk();

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('archived/index')
                ->has('projects', 1)
                ->where('projects.0.id', $archivedProject->id)
                ->where('projects.0.project_code', 'ARCH-001'),
        );
    }

    public function test_archived_project_can_be_restored(): void
    {
        $project = $this->createProject(
            code: 'ARCH-001',
            status: 'archived',
        );

        $response = $this
            ->actingAs($this->user)
            ->patch("/archived/projects/{$project->id}/restore");

        $response->assertRedirect('/archived');

        $this->assertDatabaseHas(
            'projects',
            [
                'id' => $project->id,
                'status' => 'active',
            ],
        );
    }

    private function createProject(
        string $code = 'ASRS-2026',
        string $status = 'active',
    ): Project {
        return Project::create([
            'project_code' => $code,
            'name' => 'ASRS Warehouse Upgrade',
            'description' => 'Project created by automated tests.',
            'status' => $status,
            'start_date' => '2026-08-01',
            'end_date' => '2026-12-31',
            'created_by' => $this->user->id,
        ]);
    }
}
