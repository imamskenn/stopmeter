<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OutletController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\SuperAdminDashboardController;
use App\Http\Controllers\Api\SuperAdminActivityController;
use App\Http\Controllers\Api\AdminDashboardController;
use App\Http\Controllers\Api\StopmeterController;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::prefix('super-admin')
        ->middleware('role:super_admin')
        ->group(function () {
            Route::get('/dashboard', [SuperAdminDashboardController::class, 'index']);
            Route::get('/activities', [SuperAdminActivityController::class, 'index']);
            Route::apiResource('outlets', OutletController::class);
            Route::apiResource('admins', AdminController::class);
        });

    Route::prefix('admin')
        ->middleware('role:admin')
        ->group(function () {
            Route::get('/dashboard', [AdminDashboardController::class, 'index']);
        });


    Route::prefix('stopmeters')->group(function () {
        // Employee: form Stopmeter shift berjalan + submit final.
        Route::middleware('role:employee')->group(function () {
            Route::get('/context', [StopmeterController::class, 'context']);
            Route::get('/active', [StopmeterController::class, 'active']);
            Route::post('/', [StopmeterController::class, 'store']);
        });

        Route::middleware('role:super_admin,admin,employee')->group(function () {
            Route::get('/', [StopmeterController::class, 'index']);
            Route::get('/{id}', [StopmeterController::class, 'show']);
        });
    });

    Route::prefix('management')
        ->middleware('role:super_admin,admin')
        ->group(function () {
            Route::apiResource('employees', EmployeeController::class);
        });
});
