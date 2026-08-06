<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property-read Carbon|null $start_date
 * @property-read Carbon|null $end_date
 */
class Project extends Model
{
    use SoftDeletes;

    /**
     * Fields that are allowed to be inserted or updated.
     */
    protected $fillable = [
        'created_by',
        'project_code',
        'name',
        'description',
        'status',
        'start_date',
        'end_date',
    ];

    /**
     * Convert database date values into date objects.
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }

    protected function startDate(): Attribute
    {
        return Attribute::make(
            set: fn ($value) => $value === null
                ? null
                : Carbon::parse((string) $value)->toDateString(),
        );
    }

    protected function endDate(): Attribute
    {
        return Attribute::make(
            set: fn ($value) => $value === null
                ? null
                : Carbon::parse((string) $value)->toDateString(),
        );
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<Drawing, $this>
     */
    public function drawings(): HasMany
    {
        return $this->hasMany(Drawing::class);
    }
}
