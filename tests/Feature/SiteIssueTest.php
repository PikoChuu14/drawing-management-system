<?php

namespace Tests\Feature;

use App\Models\Drawing;
use App\Models\Project;
use App\Models\SiteIssue;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SiteIssueTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Project $project;

    private Drawing $drawing;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');

        $this->user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $this->project = Project::create([
            'project_code' => 'TEST-001',
            'name' => 'Automated Test Project',
            'description' => 'Project for site issue tests.',
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
            'description' => 'Drawing for site issue tests.',
            'created_by' => $this->user->id,
        ]);
    }

    public function test_guest_cannot_report_a_site_issue(): void
    {
        $response = $this->post(
            $this->issueStoreUrl(),
            [
                'title' => 'Conveyor support clash',
                'location' => 'Zone B, Row 4',
                'priority' => 'high',
                'description' => 'The support clashes with a structural column.',
            ],
        );

        $response->assertRedirect('/login');

        $this->assertDatabaseCount(
            'site_issues',
            0,
        );
    }

    public function test_authenticated_user_can_report_an_issue_without_a_photo(): void
    {
        $response = $this
            ->actingAs($this->user)
            ->post(
                $this->issueStoreUrl(),
                [
                    'title' => 'Conveyor support clash',

                    'location' => 'Zone B, Row 4',

                    'priority' => 'high',

                    'description' => 'The conveyor support clashes '
                        .'with a structural column.',
                ],
            );

        $response->assertRedirect();

        $this->assertDatabaseHas(
            'site_issues',
            [
                'drawing_id' => $this->drawing->id,

                'title' => 'Conveyor support clash',

                'location' => 'Zone B, Row 4',

                'priority' => 'high',

                'status' => 'open',
            ],
        );

        $issue = SiteIssue::query()
            ->where(
                'drawing_id',
                $this->drawing->id,
            )
            ->firstOrFail();

        $this->assertNull(
            $issue->photo_path,
        );
    }

    public function test_authenticated_user_can_report_an_issue_with_a_photo(): void
    {
        $photo = UploadedFile::fake()->image(
            'conveyor-clash.jpg',
            1200,
            800,
        )->size(1500);

        $response = $this
            ->actingAs($this->user)
            ->post(
                $this->issueStoreUrl(),
                [
                    'title' => 'Conveyor support clash',

                    'location' => 'Zone B, Row 4',

                    'priority' => 'critical',

                    'description' => 'The support cannot be installed '
                        .'at the designed position.',

                    'photo' => $photo,
                ],
            );

        $response->assertRedirect();

        $issue = SiteIssue::query()
            ->where(
                'drawing_id',
                $this->drawing->id,
            )
            ->where(
                'title',
                'Conveyor support clash',
            )
            ->firstOrFail();

        $this->assertNotNull(
            $issue->photo_path,
        );

        Storage::disk('local')->assertExists(
            $issue->photo_path,
        );

        $this->assertDatabaseHas(
            'site_issues',
            [
                'id' => $issue->id,
                'priority' => 'critical',
                'status' => 'open',
            ],
        );
    }

    public function test_issue_title_description_and_priority_are_required(): void
    {
        $response = $this
            ->actingAs($this->user)
            ->post(
                $this->issueStoreUrl(),
                [
                    'title' => '',
                    'priority' => '',
                    'description' => '',
                ],
            );

        $response->assertSessionHasErrors([
            'title',
            'priority',
            'description',
        ]);

        $this->assertDatabaseCount(
            'site_issues',
            0,
        );
    }

    public function test_non_image_file_cannot_be_uploaded_as_an_issue_photo(): void
    {
        $invalidFile =
            UploadedFile::fake()->create(
                'site-notes.txt',
                500,
                'text/plain',
            );

        $response = $this
            ->actingAs($this->user)
            ->post(
                $this->issueStoreUrl(),
                [
                    'title' => 'Sensor position obstructed',

                    'location' => 'Conveyor Line 2',

                    'priority' => 'medium',

                    'description' => 'The proposed sensor position '
                        .'is obstructed by a guard.',

                    'photo' => $invalidFile,
                ],
            );

        $response->assertSessionHasErrors(
            'photo',
        );

        $this->assertDatabaseCount(
            'site_issues',
            0,
        );
    }

    public function test_oversized_issue_photo_is_rejected(): void
    {
        /*
         * This creates a fake 6 MB image.
         * The current UI states that the limit is 5 MB.
         */
        $largePhoto =
            UploadedFile::fake()->image(
                'large-photo.jpg',
                2000,
                1500,
            )->size(6144);

        $response = $this
            ->actingAs($this->user)
            ->post(
                $this->issueStoreUrl(),
                [
                    'title' => 'Cable tray clearance',

                    'location' => 'Electrical Room',

                    'priority' => 'medium',

                    'description' => 'Insufficient clearance above '
                        .'the main cable tray.',

                    'photo' => $largePhoto,
                ],
            );

        $response->assertSessionHasErrors(
            'photo',
        );

        $this->assertDatabaseCount(
            'site_issues',
            0,
        );
    }

    public function test_open_issue_can_be_marked_as_resolved(): void
    {
        $issue = $this->createIssue([
            'status' => 'open',
            'resolution' => null,
        ]);

        $response = $this
            ->actingAs($this->user)
            ->put(
                $this->issueUrl($issue),
                [
                    'title' => $issue->title,
                    'location' => $issue->location,
                    'priority' => $issue->priority,
                    'description' => $issue->description,

                    'status' => 'resolved',

                    'resolution' => 'The support bracket was '
                        .'relocated 150 mm away from '
                        .'the structural column.',
                ],
            );

        $response->assertRedirect();

        $this->assertDatabaseHas(
            'site_issues',
            [
                'id' => $issue->id,
                'status' => 'resolved',

                'resolution' => 'The support bracket was '
                    .'relocated 150 mm away from '
                    .'the structural column.',
            ],
        );
    }

    public function test_issue_photo_requires_authentication(): void
    {
        $photoPath =
            "site-issues/{$this->drawing->id}"
            .'/private-photo.jpg';

        Storage::disk('local')->put(
            $photoPath,
            'Private fake image content.',
        );

        $issue = $this->createIssue([
            'photo_path' => $photoPath,
        ]);

        $guestResponse = $this->get(
            $this->issuePhotoUrl($issue),
        );

        $guestResponse->assertRedirect(
            '/login',
        );

        $authenticatedResponse = $this
            ->actingAs($this->user)
            ->get(
                $this->issuePhotoUrl($issue),
            );

        $authenticatedResponse->assertOk();
    }

    public function test_issue_from_another_drawing_cannot_be_updated(): void
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

        $otherIssue = $this->createIssue(
            [],
            $otherDrawing,
        );

        /*
         * The URL intentionally contains the original
         * drawing ID while the issue belongs to the
         * second drawing.
         */
        $response = $this
            ->actingAs($this->user)
            ->put(
                "/projects/{$this->project->id}"
                ."/drawings/{$this->drawing->id}"
                ."/issues/{$otherIssue->id}",
                [
                    'title' => $otherIssue->title,

                    'location' => $otherIssue->location,

                    'priority' => $otherIssue->priority,

                    'description' => $otherIssue->description,

                    'status' => 'resolved',

                    'resolution' => 'This update must not be accepted.',
                ],
            );

        $response->assertNotFound();

        $this->assertSame(
            'open',
            $otherIssue->fresh()->status,
        );

        $this->assertNull(
            $otherIssue->fresh()->resolution,
        );
    }

    public function test_issue_photo_from_another_drawing_cannot_be_viewed(): void
    {
        $otherDrawing = Drawing::create([
            'project_id' => $this->project->id,
            'drawing_number' => 'C-001',
            'title' => 'Control Panel Arrangement',
            'discipline' => 'electrical',
            'status' => 'active',
            'description' => null,
            'created_by' => $this->user->id,
        ]);

        $photoPath =
            "site-issues/{$otherDrawing->id}"
            .'/control-panel.jpg';

        Storage::disk('local')->put(
            $photoPath,
            'Private fake image content.',
        );

        $otherIssue = $this->createIssue(
            [
                'photo_path' => $photoPath,
            ],
            $otherDrawing,
        );

        $response = $this
            ->actingAs($this->user)
            ->get(
                "/projects/{$this->project->id}"
                ."/drawings/{$this->drawing->id}"
                ."/issues/{$otherIssue->id}"
                .'/photo',
            );

        $response->assertNotFound();
    }

    public function test_drawing_page_returns_site_issues_newest_first(): void
    {
        $oldestIssue = $this->createIssue([
            'title' => 'Oldest issue',
            'created_at' => now()->subMinutes(10),

            'updated_at' => now()->subMinutes(10),
        ]);

        $middleIssue = $this->createIssue([
            'title' => 'Middle issue',
            'created_at' => now()->subMinutes(5),

            'updated_at' => now()->subMinutes(5),
        ]);

        $newestIssue = $this->createIssue([
            'title' => 'Newest issue',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this
            ->actingAs($this->user)
            ->get(
                "/projects/{$this->project->id}"
                ."/drawings/{$this->drawing->id}",
            );

        $response->assertOk();

        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('drawings/show')
                ->where(
                    'drawing.issues.0.id',
                    $newestIssue->id,
                )
                ->where(
                    'drawing.issues.1.id',
                    $middleIssue->id,
                )
                ->where(
                    'drawing.issues.2.id',
                    $oldestIssue->id,
                ),
        );
    }

    private function createIssue(
        array $overrides = [],
        ?Drawing $drawing = null,
    ): SiteIssue {
        $drawing ??= $this->drawing;

        $nextNumber =
            SiteIssue::query()->count() + 1;

        $attributes = array_merge(
            [
                'drawing_id' => $drawing->id,

                'reported_by' => $this->user->id,

                'issue_number' => 'ISS-'
                    .str_pad(
                        (string) $nextNumber,
                        4,
                        '0',
                        STR_PAD_LEFT,
                    ),

                'title' => 'Conveyor support clash',

                'location' => 'Zone B, Row 4',

                'priority' => 'high',

                'description' => 'The support clashes with '
                    .'a structural column.',

                'status' => 'open',
                'resolution' => null,
                'photo_path' => null,
            ],
            $overrides,
        );

        /*
         * forceFill is used only for arranging test data.
         * Normal application requests still use validation
         * and the model's regular fillable protection.
         */
        $issue = new SiteIssue;

        $issue->forceFill(
            $attributes,
        )->save();

        return $issue;
    }

    private function issueStoreUrl(): string
    {
        return "/projects/{$this->project->id}"
            ."/drawings/{$this->drawing->id}"
            .'/issues';
    }

    private function issueUrl(
        SiteIssue $issue,
    ): string {
        return $this->issueStoreUrl()
            ."/{$issue->id}";
    }

    private function issuePhotoUrl(
        SiteIssue $issue,
    ): string {
        return $this->issueUrl($issue)
            .'/photo';
    }
}
