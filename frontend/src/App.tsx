import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute, PublicRoute } from './routes';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { BoardDetail } from './pages/BoardDetail';
import { Profile } from './pages/Profile';
import { TenantSettings } from './pages/TenantSettings';
import { UserManagement } from './pages/UserManagement';
import { GroupManagement } from './pages/GroupManagement';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/boards/:boardId" element={<BoardDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<TenantSettings />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/groups" element={<GroupManagement />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
