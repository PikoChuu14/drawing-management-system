<?php

use App\Http\Controllers\DrawingController;
use App\Http\Controllers\ProjectController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

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

});

require __DIR__.'/settings.php';
