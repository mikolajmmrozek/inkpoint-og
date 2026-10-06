import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ThemeProvider } from '@/lib/ThemeProvider';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Pages
import Home from './pages/Home';
import Artists from './pages/Artists';
import ArtistProfile from './pages/ArtistProfile';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Contact from './pages/Contact';
import Booking from './pages/Booking';
import HealthFormPage from './pages/HealthFormPage';
import HealthFormQR from './pages/HealthFormQR';
import TermsAndConditions from './pages/TermsAndConditions';
import FAQ from './pages/FAQ';
import Instructions from './pages/Instructions';

// Dashboard
import Dashboard from './pages/dashboard/Dashboard';
import DashboardHome from './pages/dashboard/DashboardHome';
import DashboardBookings from './pages/dashboard/DashboardBookings';
import DashboardArtists from './pages/dashboard/DashboardArtists';
import DashboardBlog from './pages/dashboard/DashboardBlog';
import DashboardMessages from './pages/dashboard/DashboardMessages';
import DashboardHealthForms from './pages/dashboard/DashboardHealthForms';
import DashboardSettings from './pages/dashboard/DashboardSettings';
import DashboardClients from './pages/dashboard/DashboardClients';
import DashboardStats from './pages/dashboard/DashboardStats';
import DashboardFormTemplate from './pages/dashboard/DashboardFormTemplate';
import DashboardTermsEditor from './pages/dashboard/DashboardTermsEditor';
import DashboardDocuments from './pages/dashboard/DashboardDocuments';
import DashboardFAQ from './pages/dashboard/DashboardFAQ';
import DashboardFeedback from './pages/dashboard/DashboardFeedback';
import DashboardServices from './pages/dashboard/DashboardServices';
import DashboardPromotions from './pages/dashboard/DashboardPromotions';
import DashboardUsers from './pages/dashboard/DashboardUsers';
import NotificationsPage from './pages/shared/NotificationsPage';
import ArtistPanel from './pages/artist/ArtistPanel';
import ArtistHome from './pages/artist/ArtistHome';
import ArtistSchedule from './pages/artist/ArtistSchedule';
import ArtistStats from './pages/artist/ArtistStats';
import ArtistProfilePage from './pages/artist/ArtistProfile';
import ArtistMessages from './pages/artist/ArtistMessages';
import ClientPanel from './pages/client/ClientPanel';
import ClientHome from './pages/client/ClientHome';
import ClientSessions from './pages/client/ClientSessions';
import ClientHealthForms from './pages/client/ClientHealthForms';
import ClientVouchers from './pages/client/ClientVouchers';
import ClientProfile from './pages/client/ClientProfile';
import ClientMessages from './pages/client/ClientMessages';
import FeedbackSurvey from './pages/FeedbackSurvey';
import Voucher from './pages/Voucher';
import ChangeRequest from './pages/ChangeRequest';

import ScrollToTop from './components/ScrollToTop';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const isIOSStandalone = () => {
  return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
};

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoadingAuth && !isLoadingPublicSettings && !authError && isIOSStandalone()) {
      const currentPath = window.location.pathname;
      // Only auto-redirect if not already on a specific route that user navigated to
      if (currentPath === '/' && !window.location.search) {
        const target = user?.role === 'artist' ? '/artist' : user?.role === 'user' ? '/panel' : '/dashboard';
        navigate(target, { replace: true });
      }
    }
  }, [isLoadingAuth, isLoadingPublicSettings, authError, navigate]);

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <div className="w-8 h-px animate-pulse" style={{ background: 'var(--brand)' }} />
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/artists" element={<Artists />} />
      <Route path="/artists/:slug" element={<ArtistProfile />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:id" element={<BlogPost />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/booking" element={<Booking />} />
      <Route path="/health-form" element={<HealthFormPage />} />
      <Route path="/health-form-qr" element={<HealthFormQR />} />
      <Route path="/terms" element={<TermsAndConditions />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/instructions" element={<Instructions />} />
      <Route path="/feedback" element={<FeedbackSurvey />} />
      <Route path="/voucher/:code" element={<Voucher />} />
      <Route path="/change-request" element={<ChangeRequest />} />

      {/* Dashboard (admin only) */}
      <Route path="/dashboard" element={<Dashboard />}>
        <Route index element={<DashboardHome />} />
        <Route path="bookings" element={<DashboardBookings />} />
        <Route path="artists" element={<DashboardArtists />} />
        <Route path="blog" element={<DashboardBlog />} />
        <Route path="messages" element={<DashboardMessages />} />
        <Route path="health-forms" element={<DashboardHealthForms />} />
        <Route path="settings" element={<DashboardSettings />} />
        <Route path="clients" element={<DashboardClients />} />
        <Route path="stats" element={<DashboardStats />} />
        <Route path="form-template" element={<DashboardFormTemplate />} />
        <Route path="terms-editor" element={<DashboardTermsEditor />} />
        <Route path="documents" element={<DashboardDocuments />} />
        <Route path="faq" element={<DashboardFAQ />} />
        <Route path="feedback" element={<DashboardFeedback />} />
        <Route path="services" element={<DashboardServices />} />
        <Route path="promotions" element={<DashboardPromotions />} />
        <Route path="users" element={<DashboardUsers />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="change-requests" element={<Navigate to="/dashboard/bookings?view=pending" replace />} />
      </Route>

      {/* Artist panel */}
      <Route path="/artist" element={<ArtistPanel />}>
        <Route index element={<ArtistHome />} />
        <Route path="schedule" element={<ArtistSchedule />} />
        <Route path="stats" element={<ArtistStats />} />
        <Route path="profile" element={<ArtistProfilePage />} />
        <Route path="messages" element={<ArtistMessages />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      {/* Client panel */}
      <Route path="/panel" element={<ClientPanel />}>
        <Route index element={<ClientHome />} />
        <Route path="sessions" element={<ClientSessions />} />
        <Route path="health-forms" element={<ClientHealthForms />} />
        <Route path="vouchers" element={<ClientVouchers />} />
        <Route path="profile" element={<ClientProfile />} />
        <Route path="messages" element={<ClientMessages />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;