<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

final class ApsService
{
    /**
     * Get a token for server-side APS operations.
     *
     * This token must never be sent to the browser because
     * it has permissions to create buckets and upload files.
     *
     * @return array{
     *     access_token: string,
     *     expires_in: int
     * }
     */
    public function internalToken(): array
    {
        return $this->requestToken([
            'bucket:create',
            'bucket:read',
            'data:create',
            'data:read',
            'data:write',
        ]);
    }

    /**
     * Get a restricted token for Autodesk Viewer.
     *
     * This will be used later by the React viewer.
     *
     * @return array{
     *     access_token: string,
     *     expires_in: int
     * }
     */
    public function viewerToken(): array
    {
        return $this->requestToken([
            'viewables:read',
        ]);
    }

    /**
 * Ensure that the application's APS bucket exists.
 *
 * @return array{
 *     bucket_key: string,
 *     policy_key: string,
 *     created: bool
 * }
 */
public function ensureBucket(): array
{
    $bucketKey = $this->bucketKey();
    $baseUrl = $this->baseUrl();

    $token = $this->internalToken()['access_token'];

    /*
     * First check whether this application already owns
     * a bucket with the configured key.
     */
    $detailsResponse = Http::withToken($token)
        ->acceptJson()
        ->connectTimeout(10)
        ->timeout(30)
        ->get(
            "{$baseUrl}/oss/v2/buckets/"
            .rawurlencode($bucketKey)
            .'/details',
        );

    if ($detailsResponse->successful()) {
        return [
            'bucket_key' => $bucketKey,
            'policy_key' => (string) (
                $detailsResponse->json('policyKey')
                ?? 'unknown'
            ),
            'created' => false,
        ];
    }

    /*
     * Continue to bucket creation only when APS confirms
     * that the bucket does not exist for this application.
     */
    if ($detailsResponse->status() !== 404) {
        throw new RuntimeException(
            'APS bucket lookup failed '
            ."({$detailsResponse->status()}): "
            .$this->responseError($detailsResponse),
        );
    }

    $region = strtoupper(
        (string) config(
            'services.aps.region',
            'US',
        ),
    );

    $createResponse = Http::withToken($token)
        ->acceptJson()
        ->withHeaders([
            'x-ads-region' => $region,
        ])
        ->connectTimeout(10)
        ->timeout(30)
        ->post(
            "{$baseUrl}/oss/v2/buckets",
            [
                'bucketKey' => $bucketKey,

                /*
                 * Persistent objects remain available
                 * until explicitly deleted.
                 */
                'policyKey' => 'persistent',
            ],
        );

    if ($createResponse->status() === 409) {
        throw new RuntimeException(
            "The APS bucket key '{$bucketKey}' is already "
            .'being used. Choose another globally unique '
            .'APS_BUCKET value in .env.',
        );
    }

    if ($createResponse->failed()) {
        throw new RuntimeException(
            'APS bucket creation failed '
            ."({$createResponse->status()}): "
            .$this->responseError($createResponse),
        );
    }

    return [
        'bucket_key' => (string) (
            $createResponse->json('bucketKey')
            ?? $bucketKey
        ),

        'policy_key' => (string) (
            $createResponse->json('policyKey')
            ?? 'persistent'
        ),

        'created' => true,
    ];
}

/**
 * Get and validate the configured APS bucket key.
 */
private function bucketKey(): string
{
    $bucketKey = trim(
        (string) config(
            'services.aps.bucket',
            '',
        ),
    );

    if ($bucketKey === '') {
        throw new RuntimeException(
            'APS_BUCKET is missing from the .env file.',
        );
    }

    if (
        preg_match(
            '/^[a-z0-9_-]{3,128}$/',
            $bucketKey,
        ) !== 1
    ) {
        throw new RuntimeException(
            'APS_BUCKET must contain 3 to 128 lowercase '
            .'letters, numbers, hyphens, or underscores.',
        );
    }

    return $bucketKey;
}

    /**
     * Get the configured APS API base URL.
     */
    private function baseUrl(): string
    {
        return rtrim(
            (string) config(
                'services.aps.base_url',
                'https://developer.api.autodesk.com',
            ),
            '/',
        );
    }

    /**
     * Extract a useful error message from an APS response.
     */
    private function responseError(
        \Illuminate\Http\Client\Response $response,
    ): string {
        $possibleMessages = [
            $response->json('reason'),
            $response->json('diagnostic'),
            $response->json('error_description'),
            $response->json('error'),
        ];

        foreach ($possibleMessages as $message) {
            if (
                is_string($message)
                && trim($message) !== ''
            ) {
                return $message;
            }
        }

        $body = trim($response->body());

        return $body !== ''
            ? $body
            : 'Unknown APS error.';
    }

    /**
     * Request and cache an APS server-to-server token.
     *
     * @param  list<string>  $scopes
     * @return array{
     *     access_token: string,
     *     expires_in: int
     * }
     */
    private function requestToken(array $scopes): array
    {
        $clientId = (string) config(
            'services.aps.client_id',
            '',
        );

        $clientSecret = (string) config(
            'services.aps.client_secret',
            '',
        );

        $baseUrl = $this->baseUrl();

        if ($clientId === '' || $clientSecret === '') {
            throw new RuntimeException(
                'APS_CLIENT_ID or APS_CLIENT_SECRET is missing.',
            );
        }

        sort($scopes);

        $scopeString = implode(' ', $scopes);

        $cacheKey = 'aps.oauth.'.hash(
            'sha256',
            $scopeString,
        );

        $cached = Cache::get($cacheKey);

        if (
            is_array($cached)
            && isset(
                $cached['access_token'],
                $cached['expires_at'],
            )
            && is_string($cached['access_token'])
            && is_int($cached['expires_at'])
        ) {
            $currentTimestamp = now()->getTimestamp();
            $remainingSeconds =
                $cached['expires_at'] - $currentTimestamp;

            if ($remainingSeconds > 0) {
                return [
                    'access_token' =>
                        $cached['access_token'],

                    'expires_in' => $remainingSeconds,
                ];
            }
        }

        $response = Http::asForm()
            ->acceptJson()
            ->withBasicAuth(
                $clientId,
                $clientSecret,
            )
            ->connectTimeout(10)
            ->timeout(30)
            ->post(
                "{$baseUrl}/authentication/v2/token",
                [
                    'grant_type' =>
                        'client_credentials',

                    'scope' => $scopeString,
                ],
            );

        if ($response->failed()) {
            $error = $response->json(
                'error_description',
            );

            if (! is_string($error)) {
                $error = $response->json('error');
            }

            if (! is_string($error)) {
                $error =
                    'Unknown APS authentication error.';
            }

            throw new RuntimeException(
                "APS authentication failed "
                ."({$response->status()}): {$error}",
            );
        }

        $accessToken = $response->json(
            'access_token',
        );

        $expiresIn = $response->json(
            'expires_in',
        );

        if (
            ! is_string($accessToken)
            || $accessToken === ''
            || ! is_numeric($expiresIn)
        ) {
            throw new RuntimeException(
                'APS returned an invalid token response.',
            );
        }

        $expiresInSeconds = (int) $expiresIn;

        $expiresAt =
            now()->getTimestamp() + $expiresInSeconds;

        /*
         * Remove the token from cache two minutes before
         * its actual expiration to avoid using an expired
         * token during a long API request.
         */
        $cacheSeconds = max(
            1,
            $expiresInSeconds - 120,
        );

        Cache::put(
            $cacheKey,
            [
                'access_token' => $accessToken,
                'expires_at' => $expiresAt,
            ],
            now()->addSeconds($cacheSeconds),
        );

        return [
            'access_token' => $accessToken,
            'expires_in' => $expiresInSeconds,
        ];
    }
}