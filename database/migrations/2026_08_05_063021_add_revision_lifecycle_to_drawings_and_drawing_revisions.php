<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table(
            'drawing_revisions',
            function (Blueprint $table): void {
                $table->timestamp('archived_at')
                    ->nullable()
                    ->after('translation_completed_at');
            },
        );

        Schema::table(
            'drawings',
            function (Blueprint $table): void {
                $table->foreignId('current_revision_id')
                    ->nullable()
                    ->after('created_by')
                    ->constrained('drawing_revisions')
                    ->nullOnDelete();
            },
        );

        /*
         * Make the newest existing revision current for
         * every drawing.
         */
        $drawings = DB::table('drawings')
            ->select('id')
            ->get();

        foreach ($drawings as $drawing) {
            $revisionId = DB::table('drawing_revisions')
                ->where('drawing_id', $drawing->id)
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->value('id');

            if ($revisionId !== null) {
                DB::table('drawings')
                    ->where('id', $drawing->id)
                    ->update([
                        'current_revision_id' => $revisionId,
                    ]);
            }
        }
    }

    public function down(): void
    {
        Schema::table(
            'drawings',
            function (Blueprint $table): void {
                $table->dropConstrainedForeignId(
                    'current_revision_id',
                );
            },
        );

        Schema::table(
            'drawing_revisions',
            function (Blueprint $table): void {
                $table->dropColumn('archived_at');
            },
        );
    }
};
