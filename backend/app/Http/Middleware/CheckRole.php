<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user || !$user->is_active) {
            return response()->json([
                'message' => 'Unauthenticated or inactive account.',
            ], 401);
        }

        if (!in_array($user->role, $roles, true)) {
            return response()->json([
                'message' => 'You do not have permission.',
            ], 403);
        }

        return $next($request);
    }
}
