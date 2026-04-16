import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { isAuthenticated } from '@/shared/auth/session';
import { getUserRole } from '@/shared/auth/session';

type ProtectedRouteProps = {
  children: ReactNode;
  requiredRoles?: string[];
};

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const role = (getUserRole() || '').toLowerCase();
  const hasRole = requiredRoles ? requiredRoles.includes(role) : true;

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!hasRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
