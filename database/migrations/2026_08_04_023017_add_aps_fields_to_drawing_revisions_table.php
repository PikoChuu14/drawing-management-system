<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table(
            'drawing_revisions',
            function (Blueprint $table): void {
                $table->string('aps_object_key')
                    ->nullable();

                $table->text('aps_object_id')
                    ->nullable();

                $table->text('aps_urn')
                    ->nullable();

                $table->string('translation_status')
                    ->default('not_started');

                $table->string('translation_progress')
                    ->nullable();

                $table->text('translation_error')
                    ->nullable();

                $table->timestamp('translation_requested_at')
                    ->nullable();

                $table->timestamp('translation_completed_at')
                    ->nullable();
            },
        );
    }

    public function down(): void
    {
        Schema::table(
            'drawing_revisions',
            function (Blueprint $table): void {
                $table->dropColumn([
                    'aps_object_key',
                    'aps_object_id',
                    'aps_urn',
                    'translation_status',
                    'translation_progress',
                    'translation_error',
                    'translation_requested_at',
                    'translation_completed_at',
                ]);
            },
        );
    }
};
