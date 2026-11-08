import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { TeacherGradingPage } from './pages/TeacherGradingPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { ContentStudioPage } from './pages/admin/ContentStudioPage';
import { AnalyticsPage } from './pages/admin/AnalyticsPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route
            path="/dashboard/student"
            element={
              <ProtectedRoute role="STUDENT">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute role="TEACHER">
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/admin/users"
            element={
              <ProtectedRoute role="TEACHER">
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/admin/studio"
            element={
              <ProtectedRoute role="TEACHER">
                <ContentStudioPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/admin/grading"
            element={
              <ProtectedRoute role="TEACHER">
                <TeacherGradingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/admin/analytics"
            element={
              <ProtectedRoute role="TEACHER">
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
