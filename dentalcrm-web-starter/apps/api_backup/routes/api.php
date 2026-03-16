<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\ClinicSettingsController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\TreatmentController;
use App\Http\Controllers\UserController;
use App\Http\Middleware\SetClinicContext;

Route::prefix('v1')->middleware(SetClinicContext::class)->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/appointments/book', [AppointmentController::class, 'publicBook']);
        Route::get('/appointments/availability', [AppointmentController::class, 'availability']);
        Route::get('/users', [UserController::class, 'index']);
        Route::get('/treatments', [TreatmentController::class, 'index']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        Route::get('/dashboard/summary', [DashboardController::class, 'summary']);
        Route::get('/clinic/settings', [ClinicSettingsController::class, 'show']);
        Route::put('/clinic/settings', [ClinicSettingsController::class, 'update']);

        Route::apiResource('patients', PatientController::class)->only(['index', 'store', 'show', 'update']);
        Route::apiResource('appointments', AppointmentController::class)->only(['index', 'store', 'update', 'destroy']);
    });
});
