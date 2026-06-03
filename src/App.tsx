import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/auth/AuthContext';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { queryClient } from '@/lib/query-client';

import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import InvoiceProcessingPage from '@/pages/InvoiceProcessingPage';
import InvoiceDetailPage from '@/pages/InvoiceDetailPage';
import ComingSoonPage from '@/pages/ComingSoonPage';
import NotFoundPage from '@/pages/NotFoundPage';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={150}>
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="invoices" element={<InvoiceProcessingPage />} />
                  <Route path="invoices/:id" element={<InvoiceDetailPage />} />

                  {/* Deferred routes — polished placeholder so the shell is whole */}
                  <Route path="ocr" element={<ComingSoonPage />} />
                  <Route path="documents" element={<ComingSoonPage />} />
                  <Route path="match" element={<ComingSoonPage />} />
                  <Route path="approvals" element={<ComingSoonPage />} />
                  <Route path="exceptions" element={<ComingSoonPage />} />
                  <Route path="payments" element={<ComingSoonPage />} />
                  <Route path="vendors" element={<ComingSoonPage />} />
                  <Route path="search" element={<ComingSoonPage />} />
                  <Route path="analytics" element={<ComingSoonPage />} />
                  <Route path="audit" element={<ComingSoonPage />} />
                  <Route path="admin" element={<ComingSoonPage />} />

                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
      <Toaster />
    </QueryClientProvider>
  );
}
