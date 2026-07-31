<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Create the drawings table.
     */
    public function up(): void
    {
        Schema::create('drawings', function (Blueprint $table) {
            $table->id();

            $table->foreignId('project_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('created_by')
                ->constrained('users')
                ->restrictOnDelete();

            $table->string('drawing_number', 100);
            $table->string('title');
            $table->string('discipline', 100)->nullable();
            $table->string('status')->default('draft');
            $table->text('description')->nullable();

            $table->timestamps();

            $table->unique([
                'project_id',
                'drawing_number',
            ]);
        });
    }

    /**
     * Remove the drawings table.
     */
    public function down(): void
    {
        Schema::dropIfExists('drawings');
    }
};