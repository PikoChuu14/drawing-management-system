<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property-read Carbon|null $issued_at
 * @property-read Carbon $created_at
 * @property-read Carbon $updated_at
 * @property-read Carbon|null $translation_requested_at
 * @property-read Carbon|null $translation_completed_at
 * @property-read Carbon|null $archived_at
 */
class DrawingRevision extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'drawing_id',
        'uploaded_by',
        'revision_code',
        'file_path',
        'original_filename',
        'mime_type',
        'file_extension',
        'file_size',
        'revision_notes',
        'issued_at',
        'aps_object_key',
        'aps_object_id',
        'aps_urn',
        'translation_status',
        'translation_progress',
        'translation_error',
        'translation_requested_at',
        'translation_completed_at',
    ];

    protected function casts(): array
    {
        return [
            'issued_at' => 'date',
            'file_size' => 'integer',

            'translation_requested_at' => 'datetime',
            'translation_completed_at' => 'datetime',
            'archived_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Drawing, $this>
     */
    public function drawing(): BelongsTo
    {
        return $this->belongsTo(Drawing::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
