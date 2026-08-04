<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property-read int $id
 * @property int $project_id
 */
class Drawing extends Model
{
    use SoftDeletes;

    /**
     * Fields that may be inserted or updated.
     *
     * @var list<string>
     */
    protected $fillable = [
        'project_id',
        'created_by',
        'drawing_number',
        'title',
        'discipline',
        'status',
        'description',
    ];

    /**
     * @return BelongsTo<Project, $this>
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<DrawingRevision, $this>
     */
    public function revisions(): HasMany
    {
        return $this->hasMany(DrawingRevision::class);
    }

    /**
     * Get the site issues linked to this drawing.
     *
     * @return HasMany<SiteIssue, $this>
     */
    public function siteIssues(): HasMany
    {
        return $this->hasMany(SiteIssue::class);
    }
}
