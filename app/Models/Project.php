<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Project extends Model
{
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

    /**
     * Get the user who created this project.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
