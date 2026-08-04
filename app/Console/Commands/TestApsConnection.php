<?php

namespace App\Console\Commands;

use App\Services\ApsService;
use Illuminate\Console\Command;
use Throwable;

class TestApsConnection extends Command
{
    /**
     * Command name used in the terminal.
     *
     * @var string
     */
    protected $signature = 'aps:test';

    /**
     * Command description.
     *
     * @var string
     */
    protected $description =
        'Test APS server-to-server authentication';

    /**
     * Execute the command.
     */
    public function handle(
        ApsService $apsService,
    ): int {
        $this->info(
            'Testing Autodesk Platform Services...',
        );

        try {
            $token = $apsService->internalToken();
        } catch (Throwable $exception) {
            $this->newLine();

            $this->error(
                'APS authentication failed.',
            );

            $this->line(
                $exception->getMessage(),
            );

            return self::FAILURE;
        }

        $this->newLine();

        $this->info(
            'APS authentication successful.',
        );

        $this->table(
            ['Property', 'Result'],
            [
                ['Access token received', 'Yes'],
                [
                    'Expires in',
                    $token['expires_in'].' seconds',
                ],
            ],
        );

        $this->newLine();

        $this->comment(
            'The token value was intentionally not displayed.',
        );

        return self::SUCCESS;
    }
}
