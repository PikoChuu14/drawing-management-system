<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_issues', function (Blueprint $table) {
            $table->id();

            $table->foreignId('drawing_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('reported_by')
                ->constrained('users')
                ->restrictOnDelete();

            // Generated after insertion, for example ISS-0001.
            $table->string('issue_number', 50)
                ->nullable()
                ->unique();

            $table->string('title');
            $table->text('description');
            $table->string('location')->nullable();

            // low, medium, high, critical
            $table->string('priority')->default('medium');

            // open, in_progress, resolved, closed
            $table->string('status')->default('open');

            $table->string('photo_path')->nullable();
            $table->string('photo_original_name')->nullable();

            $table->text('resolution')->nullable();
            $table->timestamp('resolved_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_issues');
    }
};
