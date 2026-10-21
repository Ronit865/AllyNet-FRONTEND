import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/main-layout";
import { AuthProvider } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";

// User pages
import Dashboard from "./pages/Dashboard";
import Alumni from "./pages/Alumni";
import Events from "./pages/Events";
import Jobs from "./pages/Jobs";
import PostJob from "./pages/PostJob";
import Donations from "./pages/Donations";
import Communications from "./pages/Communications";
import PostDetail from "./pages/PostDetail";
import Connections from "./pages/Connections";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Auth pages
import { Login } from "./pages/auth/Login";
import { ForgotPassword } from "./pages/auth/ForgotPassword";
import { OTPVerification } from "./pages/auth/OTPVerification";
import { ResetPassword } from "./pages/auth/ResetPassword";

// Admin pages
import { Dashboard as AdminDashboard } from "./pages/admin/Dashboard";
import { Alumni as AdminAlumni } from "./pages/admin/Alumni";
import { Events as AdminEvents } from "./pages/admin/Events";
import { Jobs as AdminJobs } from "./pages/admin/Jobs";
import { Donations as AdminDonations } from "./pages/admin/Donations";
import { Communications as AdminCommunications } from "./pages/admin/Communications";
import { Reports as AdminReports } from "./pages/admin/Reports";
import { Settings as AdminSettings } from "./pages/admin/Settings";
import { AuthLayout } from "./components/layout/AuthLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SocketProvider>
        <TooltipProvider delayDuration={300}>
          {/* Sonner toast — replaces old Radix Toaster */}
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            duration={4000}
            toastOptions={{
              style: {
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                fontSize: "0.8125rem",
                fontWeight: "500",
                borderRadius: "var(--radius, 0.5rem)",
              },
              classNames: {
                closeButton: "!right-2 !left-auto !top-2",
              },
            }}
          />
          <BrowserRouter>
            <Routes>
              {/* Auth Routes */}
              <Route path="/auth" element={<AuthLayout />}>
                <Route path="login" element={<Login />} />
                <Route path="forgot-password" element={<ForgotPassword />} />
                <Route path="otp-verification" element={<OTPVerification />} />
                <Route path="reset-password" element={<ResetPassword />} />
              </Route>

              {/* Protected User Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="alumni" element={<Alumni />} />
                <Route path="events" element={<Events />} />
                <Route path="jobs" element={<Jobs />} />
                <Route path="jobs/post" element={<PostJob />} />
                <Route path="donations" element={<Donations />} />
                <Route path="communications" element={<Communications />} />
                <Route path="communications/post/:postId" element={<PostDetail />} />
                <Route path="connections" element={<Connections />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* Protected Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="alumni" element={<AdminAlumni />} />
                <Route path="events" element={<AdminEvents />} />
                <Route path="jobs" element={<AdminJobs />} />
                <Route path="donations" element={<AdminDonations />} />
                <Route path="communications" element={<AdminCommunications />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SocketProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
