import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ToastProvider } from "./hooks/useToast";
import { AdminLayout } from "./layouts/AdminLayout";
import { PublicLayout } from "./layouts/PublicLayout";
import { RequireAuth } from "./layouts/RequireAuth";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { MembersPage } from "./pages/MembersPage";
import { MemberNewPage } from "./pages/MemberNewPage";
import { MemberDetailPage } from "./pages/MemberDetailPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { PaymentNewPage } from "./pages/PaymentNewPage";
import { PlansPage } from "./pages/PlansPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { EnquiriesPage } from "./pages/EnquiriesPage";
import { PublicHomePage } from "./pages/PublicHomePage";
import { PublicEnquirePage } from "./pages/PublicEnquirePage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<PublicHomePage />} />
            <Route path="/enquire" element={<PublicEnquirePage />} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AdminLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/members" element={<MembersPage />} />
              <Route path="/members/new" element={<MemberNewPage />} />
              <Route path="/members/:id" element={<MemberDetailPage />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/payments/new" element={<PaymentNewPage />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/enquiries" element={<EnquiriesPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
