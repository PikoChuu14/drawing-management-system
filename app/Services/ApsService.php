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

        $baseUrl = rtrim(
            (string) config(
                'services.aps.base_url',
                'https://developer.api.autodesk.com',
            ),
            '/',
        );

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