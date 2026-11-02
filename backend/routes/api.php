<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OutletController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\EmployeeController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/setup-super-admin', function (Illuminate\Http\Request $request) {
    $key = config('app.super_admin_setup_key');

    if (!$key || !hash_equals($key, (string) $request->header('X-Setup-Key'))) {
        return response()->json(['message' => 'Unauthorized'], 401);
    }

    if (User::where('role', 'super_admin')->exists()) {
        return response()->json(['message' => 'Super Admin already exists'], 409);
    }

    $data = $request->validate([
        'name' => 'required|string|max:100',
        'email' => 'required|email|max:150',
        'password' => 'required|string|min:12',
    ]);

    $user = User::create([
        'name' => $data['name'],
        'email' => $data['email'],
        'password' => Hash::make($data['password']),
        'role' => 'super_admin',
        'outlet_ids' => [],
        'is_active' => true,
    ]);

    return response()->json([
        'message' => 'Super Admin created',
        'id' => (string) $user->id,
        'email' => $user->email,
    ], 201);
});
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
