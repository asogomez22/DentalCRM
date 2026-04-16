import { Suspense, lazy, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PatientPortalRoute } from '@/components/PatientPortalRoute';

const AppLayout = lazy(() => import('@/layouts/AppLayout').then((module) => ({ default: module.AppLayout })));
const DashboardPage = lazy(() =>
  import('@/modules/dashboard/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })),
);
const PatientsPage = lazy(() =>
  import('@/modules/patients/pages/PatientsPage').then((module) => ({ default: module.PatientsPage })),
);
const AppointmentsPage = lazy(() =>
  import('@/modules/appointments/pages/AppointmentsPage').then((module) => ({ default: module.AppointmentsPage })),
);
const DocumentsPage = lazy(() =>
  import('@/modules/documents/pages/DocumentsPage').then((module) => ({ default: module.DocumentsPage })),
);
const FinancePage = lazy(() =>
  import('@/modules/finance/pages/FinancePage').then((module) => ({ default: module.FinancePage })),
);
const ReportsPage = lazy(() =>
  import('@/modules/reports/pages/ReportsPage').then((module) => ({ default: module.ReportsPage })),
);
const CommunicationsPage = lazy(() =>
  import('@/modules/communications/pages/CommunicationsPage').then((module) => ({ default: module.CommunicationsPage })),
);
const OperationsPage = lazy(() =>
  import('@/modules/operations/pages/OperationsPage').then((module) => ({ default: module.OperationsPage })),
);
const EcosystemPage = lazy(() =>
  import('@/modules/ecosystem/pages/EcosystemPage').then((module) => ({ default: module.EcosystemPage })),
);
const CompliancePage = lazy(() =>
  import('@/modules/compliance/pages/CompliancePage').then((module) => ({ default: module.CompliancePage })),
);
const StaffPage = lazy(() =>
  import('@/modules/staff/pages/StaffPage').then((module) => ({ default: module.StaffPage })),
);
const SettingsPage = lazy(() =>
  import('@/modules/settings/pages/SettingsPage').then((module) => ({ default: module.SettingsPage })),
);
const LoginPage = lazy(() => import('@/modules/auth/pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const PatientPortalLoginPage = lazy(() =>
  import('@/modules/portal/pages/PatientPortalLoginPage').then((module) => ({ default: module.PatientPortalLoginPage })),
);
const PatientPortalPage = lazy(() =>
  import('@/modules/portal/pages/PatientPortalPage').then((module) => ({ default: module.PatientPortalPage })),
);
const ClinicPortalLandingPage = lazy(() =>
  import('@/modules/portal/pages/ClinicPortalLandingPage').then((module) => ({ default: module.ClinicPortalLandingPage })),
);
const PublicBookingPage = lazy(() =>
  import('@/modules/bookings/pages/PublicBookingPage').then((module) => ({ default: module.PublicBookingPage })),
);
const ClinicRegistrationPage = lazy(() =>
  import('@/modules/onboarding/pages/ClinicRegistrationPage').then((module) => ({ default: module.ClinicRegistrationPage })),
);

function LazySection({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Cargando...</div>}>
      {children}
    </Suspense>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/portal" replace />} />
      <Route
        path="/login"
        element={
          <LazySection>
            <LoginPage />
          </LazySection>
        }
      />
      <Route
        path="/alta-clinica"
        element={
          <LazySection>
            <ClinicRegistrationPage />
          </LazySection>
        }
      />
      <Route
        path="/booking"
        element={
          <LazySection>
            <PublicBookingPage />
          </LazySection>
        }
      />
      <Route
        path="/portal"
        element={
          <LazySection>
            <ClinicPortalLandingPage />
          </LazySection>
        }
      />
      <Route
        path="/portal/acceso"
        element={
          <LazySection>
            <PatientPortalLoginPage />
          </LazySection>
        }
      />
      <Route
        path="/portal/mi-area"
        element={
          <PatientPortalRoute>
            <LazySection>
              <PatientPortalPage />
            </LazySection>
          </PatientPortalRoute>
        }
      />
      <Route
        path="/portal/reservar"
        element={
          <LazySection>
            <PublicBookingPage />
          </LazySection>
        }
      />
      <Route path="/portal/login" element={<Navigate to="/portal/acceso" replace />} />
      <Route path="/portal/area" element={<Navigate to="/portal/mi-area" replace />} />
      <Route
        path="/portal/:clinicSlug"
        element={
          <LazySection>
            <ClinicPortalLandingPage />
          </LazySection>
        }
      />
      <Route
        path="/portal/:clinicSlug/acceso"
        element={
          <LazySection>
            <PatientPortalLoginPage />
          </LazySection>
        }
      />
      <Route
        path="/portal/:clinicSlug/mi-area"
        element={
          <PatientPortalRoute>
            <LazySection>
              <PatientPortalPage />
            </LazySection>
          </PatientPortalRoute>
        }
      />
      <Route
        path="/portal/:clinicSlug/reservar"
        element={
          <LazySection>
            <PublicBookingPage />
          </LazySection>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <LazySection>
              <AppLayout />
            </LazySection>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <LazySection>
              <DashboardPage />
            </LazySection>
          }
        />
        <Route
          path="/patients"
          element={
            <LazySection>
              <PatientsPage />
            </LazySection>
          }
        />
        <Route
          path="/appointments"
          element={
            <LazySection>
              <AppointmentsPage />
            </LazySection>
          }
        />
        <Route
          path="/documents"
          element={
            <LazySection>
              <DocumentsPage />
            </LazySection>
          }
        />
        <Route
          path="/finance"
          element={
            <ProtectedRoute requiredRoles={['admin', 'manager', 'owner', 'super-admin', 'administrador']}>
              <LazySection>
                <FinancePage />
              </LazySection>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute requiredRoles={['admin', 'manager', 'owner', 'super-admin', 'administrador']}>
              <LazySection>
                <ReportsPage />
              </LazySection>
            </ProtectedRoute>
          }
        />
        <Route
          path="/communications"
          element={
            <ProtectedRoute requiredRoles={['admin', 'manager', 'owner', 'super-admin', 'administrador']}>
              <LazySection>
                <CommunicationsPage />
              </LazySection>
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations"
          element={
            <ProtectedRoute requiredRoles={['admin', 'manager', 'owner', 'super-admin', 'administrador']}>
              <LazySection>
                <OperationsPage />
              </LazySection>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ecosystem"
          element={
            <ProtectedRoute requiredRoles={['admin', 'manager', 'owner', 'super-admin', 'administrador']}>
              <LazySection>
                <EcosystemPage />
              </LazySection>
            </ProtectedRoute>
          }
        />
        <Route
          path="/compliance"
          element={
            <ProtectedRoute requiredRoles={['admin', 'manager', 'owner', 'super-admin', 'administrador']}>
              <LazySection>
                <CompliancePage />
              </LazySection>
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff"
          element={
            <ProtectedRoute requiredRoles={['admin', 'manager', 'owner', 'super-admin', 'administrador']}>
              <LazySection>
                <StaffPage />
              </LazySection>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute requiredRoles={['admin', 'manager', 'owner', 'super-admin', 'administrador']}>
              <LazySection>
                <SettingsPage />
              </LazySection>
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/portal" replace />} />
    </Routes>
  );
}
