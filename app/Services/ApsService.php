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
     * Upload a local file to the APS Object Storage Service.
     *
     * @return array{
     *     bucket_key: string,
     *     object_key: string,
     *     object_id: string
     * }
     */
    public function uploadObject(
        string $localPath,
        string $objectKey,
        string $contentType = 'application/octet-stream',
    ): array {
        if (! is_file($localPath)) {
            throw new RuntimeException(
                'The local file selected for APS upload does not exist.',
            );
        }

        $fileSize = filesize($localPath);

        if ($fileSize === false || $fileSize <= 0) {
            throw new RuntimeException(
                'The local file selected for APS upload is empty.',
            );
        }

        $bucket = $this->ensureBucket();

        $bucketKey = $bucket['bucket_key'];
        $token = $this->internalToken()['access_token'];
        $baseUrl = $this->baseUrl();

        $encodedBucketKey = rawurlencode($bucketKey);
        $encodedObjectKey = rawurlencode($objectKey);

        $endpoint = "{$baseUrl}/oss/v2/buckets/"
            ."{$encodedBucketKey}/objects/"
            ."{$encodedObjectKey}/signeds3upload";

        /*
        * Our application currently accepts files up to 50 MB.
        * We therefore request one signed upload URL and upload
        * the file as a single part.
        */
        $signedResponse = Http::withToken($token)
            ->acceptJson()
            ->connectTimeout(10)
            ->timeout(30)
            ->get($endpoint, [
                'parts' => 1,
                'firstPart' => 1,

                // Give the local upload more time than the
                // two-minute APS default.
                'minutesExpiration' => 10,
            ]);

        if ($signedResponse->failed()) {
            throw new RuntimeException(
                'APS signed upload request failed '
                ."({$signedResponse->status()}): "
                .$this->responseError($signedResponse),
            );
        }

        $urls = $signedResponse->json('urls');
        $uploadKey = $signedResponse->json('uploadKey');

        if (
            ! is_array($urls)
            || ! isset($urls[0])
            || ! is_string($urls[0])
            || $urls[0] === ''
            || ! is_string($uploadKey)
            || $uploadKey === ''
        ) {
            throw new RuntimeException(
                'APS returned an invalid signed upload response.',
            );
        }

        $uploadUrl = $urls[0];

        $stream = fopen($localPath, 'rb');

        if ($stream === false) {
            throw new RuntimeException(
                'The local file could not be opened for APS upload.',
            );
        }

        try {
            /*
            * This request goes directly to the signed AWS S3 URL.
            * Do not attach the APS Bearer token to this request.
            */
            $uploadResponse = Http::connectTimeout(10)
                ->timeout(600)
                ->send('PUT', $uploadUrl, [
                    'body' => $stream,
                ]);
        } finally {
            fclose($stream);
        }

        if ($uploadResponse->failed()) {
            throw new RuntimeException(
                'The file upload to APS storage failed '
                ."({$uploadResponse->status()}): "
                .$this->responseError($uploadResponse),
            );
        }

        /*
        * APS does not consider the object complete until this
        * endpoint is called with the uploadKey.
        */
        $completeResponse = Http::withToken($token)
            ->acceptJson()
            ->withHeaders([
                'x-ads-meta-Content-Type' => $contentType,
            ])
            ->connectTimeout(10)
            ->timeout(30)
            ->post($endpoint, [
                'uploadKey' => $uploadKey,
            ]);

        if ($completeResponse->failed()) {
            throw new RuntimeException(
                'APS could not complete the object upload '
                ."({$completeResponse->status()}): "
                .$this->responseError($completeResponse),
            );
        }

        $objectId = $completeResponse->json('objectId');

        if (! is_string($objectId) || $objectId === '') {
            throw new RuntimeException(
                'APS did not return an object ID after upload.',
            );
        }

        return [
            'bucket_key' => $bucketKey,

            'object_key' => (string) (
                $completeResponse->json('objectKey')
                ?? $objectKey
            ),

            'object_id' => $objectId,
        ];
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

    /**
     * Convert an APS object ID into a URL-safe Base64 URN.
     */
    public function urnify(string $objectId): string
    {
        return rtrim(
            strtr(
                base64_encode($objectId),
                '+/',
                '-_',
            ),
            '=',
        );
    }

    /**
     * Start an SVF2 translation job for an uploaded APS object.
     *
     * @return array{
     *     urn: string,
     *     result: string
     * }
     */
    public function startTranslation(
        string $objectId,
    ): array {
        $urn = $this->urnify($objectId);

        $token = $this->internalToken()['access_token'];
        $baseUrl = $this->baseUrl();

        $region = strtoupper(
            (string) config(
                'services.aps.region',
                'US',
            ),
        );

        $response = Http::withToken($token)
            ->acceptJson()
            ->withHeaders([
                'x-ads-region' => $region,
            ])
            ->connectTimeout(10)
            ->timeout(60)
            ->post(
                "{$baseUrl}/modelderivative/v2/designdata/job",
                [
                    'input' => [
                        'urn' => $urn,
                    ],

                    'output' => [
                        'formats' => [
                            [
                                'type' => 'svf2',

                                /*
                                * APS will generate whichever
                                * applicable views exist.
                                */
                                'views' => [
                                    '2d',
                                    '3d',
                                ],
                            ],
                        ],
                    ],
                ],
            );

        if ($response->failed()) {
            throw new RuntimeException(
                'APS translation request failed '
                ."({$response->status()}): "
                .$this->responseError($response),
            );
        }

        return [
            'urn' => $urn,

            'result' => (string) (
                $response->json('result')
                ?? 'created'
            ),
        ];
    }

    /**
     * Retrieve the current Model Derivative translation status.
     *
     * @return array{
     *     status: string,
     *     progress: string|null,
     *     error: string|null
     * }
     */
    public function translationStatus(
        string $urn,
    ): array {
        $token = $this->internalToken()['access_token'];
        $baseUrl = $this->baseUrl();

        $region = strtoupper(
            (string) config(
                'services.aps.region',
                'US',
            ),
        );

        $response = Http::withToken($token)
            ->acceptJson()
            ->withHeaders([
                'x-ads-region' => $region,
            ])
            ->connectTimeout(10)
            ->timeout(30)
            ->get(
                "{$baseUrl}/modelderivative/v2/designdata/"
                .rawurlencode($urn)
                .'/manifest',
            );

        /*
        * A manifest may not exist immediately after the
        * translation request has been accepted.
        */
        if ($response->status() === 404) {
            return [
                'status' => 'pending',
                'progress' => null,
                'error' => null,
            ];
        }

        if ($response->failed()) {
            throw new RuntimeException(
                'APS manifest request failed '
                ."({$response->status()}): "
                .$this->responseError($response),
            );
        }

        $status = $response->json('status');
        $progress = $response->json('progress');

        $error = null;

        if ($status === 'failed') {
            $derivatives = $response->json('derivatives');

            if (is_array($derivatives)) {
                foreach ($derivatives as $derivative) {
                    if (! is_array($derivative)) {
                        continue;
                    }

                    $messages = $derivative['messages']
                        ?? null;

                    if (! is_array($messages)) {
                        continue;
                    }

                    foreach ($messages as $message) {
                        if (is_string($message)) {
                            $error = $message;
                            break 2;
                        }

                        if (
                            is_array($message)
                            && isset($message['message'])
                            && is_string(
                                $message['message'],
                            )
                        ) {
                            $error = $message['message'];
                            break 2;
                        }
                    }
                }
            }

            $error ??= 'APS could not translate this DWG file.';
        }

        return [
            'status' => is_string($status)
                ? $status
                : 'pending',

            'progress' => is_string($progress)
                ? $progress
                : null,

            'error' => $error,
        ];
    }
}