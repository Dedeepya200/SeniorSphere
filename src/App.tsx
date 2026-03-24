import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import AppHeader from "./components/AppHeader";
import SideNav from "./components/SideNav";
import BottomNav from "./components/BottomNav";
import EmergencyButton from "./components/EmergencyButton";
import RouteErrorBoundary from "./components/RouteErrorBoundary";
import Dashboard from "./pages/Dashboard";
import FamilyDashboard from "./pages/FamilyDashboard";
import ModeratorDashboard from "./pages/ModeratorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Community from "./pages/Community";
import Events from "./pages/Events";
import Skills from "./pages/Skills";
import HelpRequests from "./pages/HelpRequests";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Messages from "./pages/Messages";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-senior-lg text-muted-foreground">{t("app.loading")}</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const RoleBasedHome = () => {
  const { role } = useAuth();
  if (role === "admin") return <AdminDashboard />;
  if (role === "family_member") return <FamilyDashboard />;
  if (role === "moderator") return <ModeratorDashboard />;
  return <Dashboard />;
};

const AppContent = () => {
  const { role } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <div className="flex flex-1">
        <SideNav />
        <main className="flex-1 p-4 lg:p-6 overflow-auto pb-20 md:pb-6">
          <div className="max-w-6xl mx-auto">
            <RouteErrorBoundary>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/dashboard" element={<ProtectedRoute><RoleBasedHome /></ProtectedRoute>} />
              <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
              <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
              <Route path="/skills" element={<ProtectedRoute><Skills /></ProtectedRoute>} />
                <Route path="/help" element={<ProtectedRoute><HelpRequests /></ProtectedRoute>} />
                <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </RouteErrorBoundary>
          </div>
        </main>
      </div>
      <BottomNav />
      {role === "senior" && <EmergencyButton />}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
