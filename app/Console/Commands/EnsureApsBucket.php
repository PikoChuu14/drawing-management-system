<?php

namespace App\Console\Commands;

use App\Services\ApsService;
use Illuminate\Console\Command;
use Throwable;

class EnsureApsBucket extends Command
{
    /**
     * The command name.
     *
     * @var string
     */
    protected $signature = 'aps:bucket';

    /**
     * The command description.
     *
     * @var string
     */
    protected $description =
        'Create or verify the APS object storage bucket';

    /**
     * Execute the command.
     */
    public function handle(
        ApsService $apsService,
    ): int {
        $this->info(
            'Checking the APS storage bucket...',
        );

        try {
            $bucket = $apsService->ensureBucket();
        } catch (Throwable $exception) {
            $this->newLine();
            $this->error('APS bucket setup failed.');
            $this->line($exception->getMessage());

            return self::FAILURE;
        }

        $status = $bucket['created']
            ? 'Created successfully'
            : 'Already exists';

        $this->newLine();

        $this->info('APS bucket is ready.');

        $this->table(
            ['Property', 'Value'],
            [
                [
                    'Bucket key',
                    $bucket['bucket_key'],
                ],
                [
                    'Retention policy',
                    $bucket['policy_key'],
                ],
                [
                    'Status',
                    $status,
                ],
            ],
        );

        return self::SUCCESS;
    }
}
