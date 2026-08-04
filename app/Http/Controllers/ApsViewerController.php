<?php

namespace App\Http\Controllers;

use App\Services\ApsService;
use Illuminate\Http\JsonResponse;

class ApsViewerController extends Controller
{
    /**
     * Return a temporary, restricted APS Viewer token.
     */
    public function token(
        ApsService $apsService,
    ): JsonResponse {
        $token = $apsService->viewerToken();

        return response()
            ->json([
                'access_token' => $token['access_token'],
                'expires_in' => $token['expires_in'],
            ])
            ->header(
                'Cache-Control',
                'private, no-store, max-age=0',
            );
    }
}
