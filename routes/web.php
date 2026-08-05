<?php

use App\Http\Controllers\ApsViewerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DrawingController;
use App\Http\Controllers\DrawingRevisionController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\SiteIssueController;
use App\Http\Controllers\TrashController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'],
    )->name('dashboard');

    Route::get('projects', [ProjectController::class, 'index'])
        ->name('projects.index');

    Route::post('projects', [ProjectController::class, 'store'])
        ->name('projects.store');

    Route::get('projects/{project}', [
        ProjectController::class,
        'show',
    ])->name('projects.show');

    Route::post('projects/{project}/drawings', [
        DrawingController::class,
        'store',
    ])->name('drawings.store');

    Route::get(
        'projects/{project}/drawings/{drawing}',
        [DrawingController::class, 'show'],
    )->name('drawings.show');

    Route::post(
        'projects/{project}/drawings/{drawing}/revisions',
        [DrawingRevisionController::class, 'store'],
    )->name('revisions.store');

    Route::get(
        'projects/{project}/drawings/{drawing}/revisions/{revision}/preview',
        [DrawingRevisionController::class, 'preview'],
    )->name('revisions.preview');

    Route::get(
        'projects/{project}/drawings/{drawing}/revisions/{revision}/download',
        [DrawingRevisionController::class, 'download'],
    )->name('revisions.download');

    Route::get(
        'projects/{project}/edit',
        [ProjectController::class, 'edit'],
    )->name('projects.edit');

    Route::put(
        'projects/{project}',
        [ProjectController::class, 'update'],
    )->name('projects.update');

    Route::patch(
        'projects/{project}/archive',
        [ProjectController::class, 'archive'],
    )->name('projects.archive');

    Route::delete(
        'projects/{project}',
        [ProjectController::class, 'destroy'],
    )->name('projects.destroy');

    Route::get(
        'projects/{project}/drawings/{drawing}/edit',
        [DrawingController::class, 'edit'],
    )->name('drawings.edit');

    Route::put(
        'projects/{project}/drawings/{drawing}',
        [DrawingController::class, 'update'],
    )->name('drawings.update');

    Route::delete(
        'projects/{project}/drawings/{drawing}',
        [DrawingController::class, 'destroy'],
    )->name('drawings.destroy');

    Route::get(
        'trash',
        [TrashController::class, 'index'],
    )->name('trash.index');

    Route::patch(
        'trash/projects/{projectId}/restore',
        [TrashController::class, 'restoreProject'],
    )->name('trash.projects.restore');

    Route::patch(
        'trash/drawings/{drawingId}/restore',
        [TrashController::class, 'restoreDrawing'],
    )->name('trash.drawings.restore');

    Route::post(
        'projects/{project}/drawings/{drawing}/issues',
        [SiteIssueController::class, 'store'],
    )->name('issues.store');

    Route::get(
        'projects/{project}/drawings/{drawing}/issues/{siteIssue}/edit',
        [SiteIssueController::class, 'edit'],
    )->name('issues.edit');

    Route::put(
        'projects/{project}/drawings/{drawing}/issues/{siteIssue}',
        [SiteIssueController::class, 'update'],
    )->name('issues.update');

    Route::get(
        'projects/{project}/drawings/{drawing}/issues/{siteIssue}/photo',
        [SiteIssueController::class, 'photo'],
    )->name('issues.photo');

    Route::post(
        'projects/{project}/drawings/{drawing}/revisions/{revision}/aps/process',
        [
            DrawingRevisionController::class,
            'processForPreview',
        ],
    )->name('revisions.aps.process');

    Route::patch(
        'projects/{project}/drawings/{drawing}/revisions/{revision}/aps/status',
        [
            DrawingRevisionController::class,
            'refreshTranslationStatus',
        ],
    )->name('revisions.aps.status');

    Route::get(
        'aps/viewer-token',
        [ApsViewerController::class, 'token'],
    )->name('aps.viewer-token');

    Route::put(
    'projects/{project}/drawings/{drawing}/revisions/{revision}',
    [
        DrawingRevisionController::class,
        'update', ],
    )->name('revisions.update');

    Route::patch(
        'projects/{project}/drawings/{drawing}/revisions/{revision}/make-current',
        [
            DrawingRevisionController::class,
            'makeCurrent',
        ],
    )->name('revisions.make-current');

    Route::patch(
        'projects/{project}/drawings/{drawing}/revisions/{revision}/archive',
        [
            DrawingRevisionController::class,
            'archive',
        ],
    )->name('revisions.archive');

    Route::patch(
        'projects/{project}/drawings/{drawing}/revisions/{revision}/restore',
        [
            DrawingRevisionController::class,
            'restore',
        ],
    )->name('revisions.restore');

    Route::delete(
        'projects/{project}/drawings/{drawing}/revisions/{revision}',
        [
            DrawingRevisionController::class,
            'destroy',
        ],
    )->name('revisions.destroy');

});

require __DIR__.'/settings.php';
