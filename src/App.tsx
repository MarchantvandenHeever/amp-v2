import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login";
import SuperAdminDashboard from "./pages/admin/Dashboard";
import ScoringConfig from "./pages/admin/ScoringConfig";
import ChangeManagerDashboard from "./pages/manage/Dashboard";
import InitiativeList from "./pages/manage/Initiatives";
import JourneyBuilder from "./pages/manage/JourneyBuilder";
import UserManagement from "./pages/manage/Users";
import ContentLibrary from "./pages/manage/ContentLibrary";
import AnnouncementManagement from "./pages/manage/Announcements";
import RiskInsights from "./pages/manage/RiskInsights";
import Analytics from "./pages/manage/Analytics";
import TeamDashboard from "./pages/team/Dashboard";
import EndUserDashboard from "./pages/user/Dashboard";
import MyProgress from "./pages/user/MyProgress";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={isAuthenticated ? <Navigate to="/login" replace /> : <Navigate to="/login" replace />} />

      {/* Super Admin */}
      <Route path="/admin" element={<ProtectedRoute><SuperAdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/scoring" element={<ProtectedRoute><ScoringConfig /></ProtectedRoute>} />
      <Route path="/admin/*" element={<ProtectedRoute><SuperAdminDashboard /></ProtectedRoute>} />

      {/* Change Manager */}
      <Route path="/manage" element={<ProtectedRoute><ChangeManagerDashboard /></ProtectedRoute>} />
      <Route path="/manage/initiatives" element={<ProtectedRoute><InitiativeList /></ProtectedRoute>} />
      <Route path="/manage/journeys" element={<ProtectedRoute><JourneyBuilder /></ProtectedRoute>} />
      <Route path="/manage/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
      <Route path="/manage/content" element={<ProtectedRoute><ContentLibrary /></ProtectedRoute>} />
      <Route path="/manage/announcements" element={<ProtectedRoute><AnnouncementManagement /></ProtectedRoute>} />
      <Route path="/manage/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/manage/risk" element={<ProtectedRoute><RiskInsights /></ProtectedRoute>} />

      {/* Team Lead */}
      <Route path="/team" element={<ProtectedRoute><TeamDashboard /></ProtectedRoute>} />
      <Route path="/team/*" element={<ProtectedRoute><TeamDashboard /></ProtectedRoute>} />

      {/* End User */}
      <Route path="/dashboard" element={<ProtectedRoute><EndUserDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/initiatives" element={<ProtectedRoute><EndUserDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/progress" element={<ProtectedRoute><MyProgress /></ProtectedRoute>} />
      <Route path="/dashboard/achievements" element={<ProtectedRoute><MyProgress /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
