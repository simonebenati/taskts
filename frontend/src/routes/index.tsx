import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="flex-center min-h-screen text-slate-400">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export const PublicRoute = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="flex-center min-h-screen text-slate-400">Loading...</div>;
    }

    if (user) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};
