<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\ClinicSettingsController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\TreatmentController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\StaffScheduleController;
use App\Http\Controllers\PatientPortalAuthController;
use App\Http\Controllers\PatientPortalController;
use App\Http\Controllers\CommunicationsController;
use App\Http\Controllers\ComplianceController;
use App\Http\Controllers\EcosystemController;
use App\Http\Controllers\OperationsController;
use App\Http\Controllers\PublicClinicController;
use App\Http\Controllers\ReportsController;
use App\Http\Middleware\AuditApiActivity;
use App\Http\Middleware\EnsurePortalPatient;
use App\Http\Middleware\SetClinicContext;

Route::prefix('v1')->group(function () {
    Route::post('/public/clinics/register', [PublicClinicController::class, 'register']);
});

Route::prefix('v1')->middleware(SetClinicContext::class)->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/portal/login', [PatientPortalAuthController::class, 'login']);
    Route::post('/appointments/book', [AppointmentController::class, 'publicBook']);
    Route::get('/appointments/availability', [AppointmentController::class, 'availability']);
    Route::get('/catalog/dentists', [UserController::class, 'publicDentists']);
    Route::get('/catalog/treatments', [TreatmentController::class, 'publicIndex']);
    Route::get('/clinic/public-settings', [ClinicSettingsController::class, 'publicShow']);
    Route::get('/openapi', [EcosystemController::class, 'openApi']);

    Route::middleware(['auth:sanctum', AuditApiActivity::class])->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        Route::get('/dashboard/summary', [DashboardController::class, 'summary']);
        Route::get('/reports/summary', [ReportsController::class, 'summary']);
        Route::get('/clinic/settings', [ClinicSettingsController::class, 'show']);
        Route::put('/clinic/settings', [ClinicSettingsController::class, 'update']);
        Route::get('/users', [UserController::class, 'index']);
        Route::get('/treatments', [TreatmentController::class, 'index']);
        Route::get('/documents/{document}/download', [DocumentController::class, 'download']);

        Route::apiResource('patients', PatientController::class)->only(['index', 'store', 'show', 'update']);
        Route::apiResource('appointments', AppointmentController::class)->only(['index', 'store', 'update', 'destroy']);
        Route::apiResource('invoices', InvoiceController::class)->only(['index', 'show', 'store', 'update']);
        Route::apiResource('payments', PaymentController::class)->only(['index', 'store']);
        Route::apiResource('documents', DocumentController::class)->only(['index', 'store', 'destroy']);
        Route::apiResource('staff-schedules', StaffScheduleController::class)->only(['index', 'store', 'update', 'destroy']);

        Route::get('/communications/templates', [CommunicationsController::class, 'templates']);
        Route::post('/communications/templates', [CommunicationsController::class, 'storeTemplate']);
        Route::put('/communications/templates/{communicationTemplate}', [CommunicationsController::class, 'updateTemplate']);
        Route::get('/communications/campaigns', [CommunicationsController::class, 'campaigns']);
        Route::post('/communications/campaigns', [CommunicationsController::class, 'storeCampaign']);
        Route::post('/communications/campaigns/{communicationCampaign}/send', [CommunicationsController::class, 'sendCampaign']);
        Route::get('/communications/logs', [CommunicationsController::class, 'logs']);
        Route::post('/communications/logs', [CommunicationsController::class, 'storeLog']);

        Route::get('/operations/locations', [OperationsController::class, 'locations']);
        Route::post('/operations/locations', [OperationsController::class, 'storeLocation']);
        Route::put('/operations/locations/{location}', [OperationsController::class, 'updateLocation']);
        Route::get('/operations/suppliers', [OperationsController::class, 'suppliers']);
        Route::post('/operations/suppliers', [OperationsController::class, 'storeSupplier']);
        Route::get('/operations/inventory/summary', [OperationsController::class, 'inventorySummary']);
        Route::get('/operations/inventory/items', [OperationsController::class, 'inventoryItems']);
        Route::post('/operations/inventory/items', [OperationsController::class, 'storeInventoryItem']);
        Route::put('/operations/inventory/items/{inventoryItem}', [OperationsController::class, 'updateInventoryItem']);
        Route::get('/operations/inventory/movements', [OperationsController::class, 'stockMovements']);
        Route::post('/operations/inventory/movements', [OperationsController::class, 'storeStockMovement']);
        Route::get('/operations/purchase-orders', [OperationsController::class, 'purchaseOrders']);
        Route::post('/operations/purchase-orders', [OperationsController::class, 'storePurchaseOrder']);

        Route::get('/ecosystem/integrations', [EcosystemController::class, 'integrations']);
        Route::put('/ecosystem/integrations/{provider}', [EcosystemController::class, 'upsertIntegration']);
        Route::get('/ecosystem/api-keys', [EcosystemController::class, 'apiKeys']);
        Route::post('/ecosystem/api-keys', [EcosystemController::class, 'storeApiKey']);
        Route::delete('/ecosystem/api-keys/{apiKey}', [EcosystemController::class, 'revokeApiKey']);
        Route::get('/ecosystem/webhooks', [EcosystemController::class, 'webhooks']);
        Route::post('/ecosystem/webhooks', [EcosystemController::class, 'storeWebhook']);
        Route::delete('/ecosystem/webhooks/{webhookSubscription}', [EcosystemController::class, 'deleteWebhook']);

        Route::get('/compliance/audit-logs', [ComplianceController::class, 'auditLogs']);
        Route::get('/compliance/consents', [ComplianceController::class, 'consents']);
        Route::post('/compliance/consents', [ComplianceController::class, 'storeConsent']);
        Route::put('/compliance/consents/{consentRecord}', [ComplianceController::class, 'updateConsent']);
        Route::get('/compliance/privacy-requests', [ComplianceController::class, 'privacyRequests']);
        Route::put('/compliance/privacy-requests/{privacyRequest}', [ComplianceController::class, 'updatePrivacyRequest']);
        Route::get('/compliance/patients/{patient}/export', [ComplianceController::class, 'exportPatientData']);
    });

    Route::prefix('portal')
        ->middleware(['auth:sanctum', AuditApiActivity::class, EnsurePortalPatient::class])
        ->group(function () {
            Route::get('/me', [PatientPortalAuthController::class, 'me']);
            Route::post('/logout', [PatientPortalAuthController::class, 'logout']);
            Route::get('/summary', [PatientPortalController::class, 'summary']);
            Route::get('/appointments', [PatientPortalController::class, 'appointments']);
            Route::post('/appointments/{appointment}/cancel', [PatientPortalController::class, 'cancelAppointment']);
            Route::get('/invoices', [PatientPortalController::class, 'invoices']);
            Route::get('/documents', [PatientPortalController::class, 'documents']);
            Route::get('/documents/{document}/download', [PatientPortalController::class, 'downloadDocument']);
            Route::get('/communications', [PatientPortalController::class, 'communications']);
            Route::post('/communications', [PatientPortalController::class, 'sendMessage']);
            Route::get('/reviews', [PatientPortalController::class, 'reviews']);
            Route::post('/reviews', [PatientPortalController::class, 'storeReview']);
            Route::get('/referrals', [PatientPortalController::class, 'referrals']);
            Route::post('/referrals', [PatientPortalController::class, 'storeReferral']);
            Route::get('/privacy-requests', [PatientPortalController::class, 'privacyRequests']);
            Route::post('/privacy-requests', [PatientPortalController::class, 'storePrivacyRequest']);
            Route::get('/consents', [PatientPortalController::class, 'consents']);
        });
});
