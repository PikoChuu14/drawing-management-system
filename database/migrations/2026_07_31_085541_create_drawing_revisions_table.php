<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('drawing_revisions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('drawing_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->foreignId('uploaded_by')
                ->constrained('users')
                ->restrictOnDelete();

            $table->string('revision_code', 50);
            $table->string('file_path');
            $table->string('original_filename');
            $table->string('mime_type')->nullable();
            $table->string('file_extension', 20)->nullable();
            $table->unsignedBigInteger('file_size');

            $table->text('revision_notes')->nullable();
            $table->date('issued_at')->nullable();

            $table->timestamps();

            $table->unique([
                'drawing_id',
                'revision_code',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('drawing_revisions');
    }
};
