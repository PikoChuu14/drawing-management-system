<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property-read int $id
 * @property int $drawing_id
 * @property int|null $reported_by
 * @property-read \Illuminate\Support\Carbon|null $created_at
 * @property-read \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Support\Carbon|null $resolved_at
 */
class SiteIssue extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'drawing_id',
        'reported_by',
        'issue_number',
        'title',
        'description',
        'location',
        'priority',
        'status',
        'photo_path',
        'photo_original_name',
        'resolution',
        'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'resolved_at' => 'datetime',
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
    public function reporter(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'reported_by',
        );
    }
}