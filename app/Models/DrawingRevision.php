<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property-read Carbon|null $issued_at
 * @property-read Carbon $created_at
 * @property-read Carbon $updated_at
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
    ];

    protected function casts(): array
    {
        return [
            'issued_at' => 'date',
            'file_size' => 'integer',
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