<?php

use App\Models\Drawing;
use App\Models\Project;
use App\Models\SiteIssue;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('dashboard summary includes open site issues count', function () {
    $user = User::factory()->create();

    $project = Project::create([
        'created_by' => $user->id,
        'project_code' => 'DB-001',
        'name' => 'Dashboard Metrics Project',
        'description' => 'Project for dashboard summary metric tests.',
        'status' => 'active',
    ]);

    $drawing = Drawing::create([
        'project_id' => $project->id,
        'created_by' => $user->id,
        'drawing_number' => 'A-101',
        'title' => 'General Arrangement',
        'status' => 'draft',
    ]);

    SiteIssue::create([
        'drawing_id' => $drawing->id,
        'reported_by' => $user->id,
        'issue_number' => 'ISS-0001',
        'title' => 'Open issue',
        'description' => 'Issue is still open.',
        'priority' => 'medium',
        'status' => 'open',
    ]);

    SiteIssue::create([
        'drawing_id' => $drawing->id,
        'reported_by' => $user->id,
        'issue_number' => 'ISS-0002',
        'title' => 'Resolved issue',
        'description' => 'Issue has been resolved.',
        'priority' => 'high',
        'status' => 'resolved',
    ]);

    SiteIssue::create([
        'drawing_id' => $drawing->id,
        'reported_by' => $user->id,
        'issue_number' => 'ISS-0003',
        'title' => 'Closed issue',
        'description' => 'Issue has been closed.',
        'priority' => 'low',
        'status' => 'closed',
    ]);

    $response = $this
        ->actingAs($user)
        ->get(route('dashboard'));

    $response->assertOk();

    $response->assertInertia(
        fn (Assert $page) => $page
            ->component('dashboard')
            ->where('summary.open_issues', 1),
    );
});
