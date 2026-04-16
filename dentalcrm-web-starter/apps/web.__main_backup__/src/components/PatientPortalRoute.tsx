import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { isPatientPortalAuthenticated } from '@/shared/auth/patientPortalSession';
import { getClinicPortalPath, resolveClinicSlugFromPathname } from '@/shared/clinic/paths';

type PatientPortalRouteProps = {
  children: ReactNode;
};

export function PatientPortalRoute({ children }: PatientPortalRouteProps) {
  const location = useLocation();

  if (!isPatientPortalAuthenticated()) {
    const clinicSlug = resolveClinicSlugFromPathname(location.pathname);
    return <Navigate to={getClinicPortalPath('login', clinicSlug)} state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
