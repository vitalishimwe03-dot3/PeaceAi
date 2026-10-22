import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { PublicLayout } from '@/components/marketing/PublicLayout'
import { AppLayout } from '@/components/layout/AppLayout'
import { AdminLayout } from '@/components/admin/AdminTabs'
import { AdminRoute, ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AuthLayout } from '@/pages/auth/AuthLayout'
import { SignInPage } from '@/pages/auth/SignInPage'
import { SignUpPage } from '@/pages/auth/SignUpPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage'
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage'
import { HomePage } from '@/pages/public/HomePage'
import { AssistantLandingPage } from '@/pages/public/AssistantLandingPage'
import { DevelopmentLandingPage } from '@/pages/public/DevelopmentLandingPage'
import { CybersecurityPage } from '@/pages/public/CybersecurityPage'
import { ServicesPage } from '@/pages/public/ServicesPage'
import { ServiceDetailPage } from '@/pages/public/ServiceDetailPage'
import { PricingPage } from '@/pages/public/PricingPage'
import { AboutPage } from '@/pages/public/AboutPage'
import { ContactPage } from '@/pages/public/ContactPage'
import { FaqPage } from '@/pages/public/FaqPage'
import { LegalPage } from '@/pages/public/LegalPage'
import { DashboardPage } from '@/pages/app/DashboardPage'
import { AssistantPage } from '@/pages/app/AssistantPage'
import { DevelopmentPage } from '@/pages/app/DevelopmentPage'
import { StoragePage } from '@/pages/app/StoragePage'
import { CollaborationPage } from '@/pages/app/CollaborationPage'
import { AppServicesPage } from '@/pages/app/AppServicesPage'
import { BillingPage } from '@/pages/app/BillingPage'
import { UsagePage } from '@/pages/app/UsagePage'
import { SettingsPage } from '@/pages/app/SettingsPage'
import { UnauthorizedPage } from '@/pages/app/UnauthorizedPage'
import { AdminOverviewPage } from '@/pages/admin/AdminOverviewPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AdminAiPage } from '@/pages/admin/AdminAiPage'
import { AdminKnowledgePage } from '@/pages/admin/AdminKnowledgePage'
import { AdminRequestsPage } from '@/pages/admin/AdminRequestsPage'
import { AdminServicesPage } from '@/pages/admin/AdminServicesPage'
import { AdminPlansPage } from '@/pages/admin/AdminPlansPage'
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage'
import { AdminAuditPage } from '@/pages/admin/AdminAuditPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1))
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])
  return null
}

export default function App() {
  return (
    <>
      <ScrollManager />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/assistant" element={<AssistantLandingPage />} />
          <Route path="/development" element={<DevelopmentLandingPage />} />
          <Route path="/cybersecurity" element={<CybersecurityPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/:slug" element={<ServiceDetailPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/legal" element={<LegalPage />} />
          <Route path="/legal/:slug" element={<LegalPage />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/app" element={<DashboardPage />} />
          <Route path="/app/assistant" element={<AssistantPage />} />
          <Route path="/app/development" element={<DevelopmentPage />} />
          <Route path="/app/storage" element={<StoragePage />} />
          <Route path="/app/collaboration" element={<CollaborationPage />} />
          <Route path="/app/services" element={<AppServicesPage />} />
          <Route path="/app/billing" element={<BillingPage />} />
          <Route path="/app/usage" element={<UsagePage />} />
          <Route path="/app/settings" element={<SettingsPage />} />
          <Route path="/app/unauthorized" element={<UnauthorizedPage />} />

          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminOverviewPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="ai" element={<AdminAiPage />} />
            <Route path="knowledge" element={<AdminKnowledgePage />} />
            <Route path="requests" element={<AdminRequestsPage />} />
            <Route path="services" element={<AdminServicesPage />} />
            <Route path="plans" element={<AdminPlansPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="audit" element={<AdminAuditPage />} />
          </Route>

          <Route path="/app/*" element={<Navigate to="/app" replace />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}
