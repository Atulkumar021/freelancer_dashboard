import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';

interface Props {
  children: React.ReactNode;
  roles?: UserRole[];
}

export function ProtectedRoute({ children, roles }: Props) {
  const { user, loading, viewingCompanyId } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="size-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Superadmin with no org selected → go to Admin Panel (only at top-level wrapper)
  if (
    !roles &&
    user.role === 'superadmin' &&
    !viewingCompanyId &&
    location.pathname !== '/superadmin'
  ) {
    return <Navigate to="/superadmin" replace />;
  }

  return <>{children}</>;
}
