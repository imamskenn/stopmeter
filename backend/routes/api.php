<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OutletController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\EmployeeController;
use Illuminate\Support\Facades\DB;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::prefix('super-admin')
        ->middleware('role:super_admin')
        ->group(function () {
            Route::get('/dashboard', function () {
                return response()->json([
                    'message' => 'Super Admin access granted.',
                ]);
            });

            Route::apiResource('outlets', OutletController::class);
            Route::apiResource('admins', AdminController::class);
        });

    Route::prefix('management')
        ->middleware('role:super_admin,admin')
        ->group(function () {
            Route::apiResource('employees', EmployeeController::class);
        });
});

Route::get('/test-db', function () {
    try {
        DB::connection('mongodb')->getMongoDB()->listCollections();

        return response()->json([
            'status' => 'connected',
            'database' => config('database.connections.mongodb.database'),
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage(),
        ], 500);
    }
});
