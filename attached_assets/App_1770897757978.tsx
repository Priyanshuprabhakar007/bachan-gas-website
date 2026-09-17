
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User, UserRole, CustomerType } from './types';

// Components
import Layout from './components/Layout';

// Management Module Imports
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import AdminCustomerPricing from './pages/admin/AdminCustomerPricing';
import Orders from './pages/Orders';
import Billing from './pages/Billing';
import AdminCredits from './pages/admin/AdminCredits';
import Tickets from './pages/Tickets';
import AdminTutorials from './pages/admin/AdminTutorials'; 
import AdminGallery from './pages/admin/AdminGallery';
import AdminProducts from './pages/admin/AdminProducts';
import AdminCatalog from './pages/admin/AdminCatalog';
import AdminSettings from './pages/admin/AdminSettings';
import BrandingSettings from './pages/admin/BrandingSettings';
import AdminSubadmins from './pages/admin/AdminSubadmins';
import AdminStores from './pages/admin/AdminStores';
import WhatsAppCenter from './pages/admin/WhatsAppCenter';
import WhatsAppLogs from './pages/admin/WhatsAppLogs';
import AdminContactInbox from './pages/admin/AdminContactInbox';
import SapDashboard from './pages/admin/SapIntegration/SapDashboard';
import GatePassList from './pages/admin/GatePass/GatePassList';
import GatePassDetail from './pages/admin/GatePass/GatePassDetail';
import CreateGatePass from './pages/admin/GatePass/CreateGatePass';
import AdminNotifications from './pages/admin/AdminNotifications';

// Public Module Imports
import LandingPage from './pages/LandingPage';
import ApplyConnection from './pages/ApplyConnection'; 
import AboutUs from './pages/AboutUs';
import ProductsPage from './pages/ProductsPage';
import Gallery from './pages/Gallery';
import ProductDetailPage from './pages/ProductDetailPage';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import PaymentResult from './pages/PaymentResult';
import StoresPage from './pages/StoresPage';
import StoreDetailPage from './pages/StoreDetailPage';
import ContactPage from './pages/ContactPage';
import Login from './pages/Login';
import StaffLogin from './pages/StaffLogin';
import StaffDashboard from './pages/StaffDashboard';
import AdminLogin from './pages/admin/AdminLogin';
import PublicInvoiceView from './pages/PublicInvoiceView';
import AcceptDeliveryPage from './pages/AcceptDeliveryPage';

// Account Module Imports
import AccountLayout from './pages/account/AccountLayout';
import AccountOverview from './pages/account/AccountOverview';
import InternalCatalog from './pages/account/InternalCatalog';
import CustomerProfile from './pages/account/CustomerProfile';
import CustomerOrders from './pages/account/CustomerOrders';
import CustomerOrderDetail from './pages/account/CustomerOrderDetail';
import CustomerLedger from './pages/account/CustomerLedger';
import CustomerAddresses from './pages/account/CustomerAddresses';
import ReferralPage from './pages/account/ReferralPage';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (u: User, token: string) => {
    setUser(u);
    localStorage.setItem('user', JSON.stringify(u));
    localStorage.setItem('token', token);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B1526]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const getRedirectPath = (user: User) => {
    if (user.role === UserRole.STAFF || user.role === UserRole.GODOWN_KEEPER) return "/staff";
    if (user.role === UserRole.ACCOUNTANT) return "/management/dashboard";
    if (user.role === UserRole.CUSTOMER) return "/account/book";
    return "/management/dashboard";
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/apply-connection" element={<ApplyConnection />} />
        <Route path="/about-us" element={<AboutUs />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:slug" element={<ProductDetailPage />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/stores" element={<StoresPage />} />
        <Route path="/stores/:slug" element={<StoreDetailPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/developed-by" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/payment/success" element={<PaymentResult status="success" />} />
        <Route path="/payment/failed" element={<PaymentResult status="failed" />} />
        
        <Route path="/i/:shortId" element={<PublicInvoiceView />} />
        <Route path="/accept/:token" element={<AcceptDeliveryPage />} />

        <Route 
          path="/login" 
          element={user ? <Navigate to={getRedirectPath(user)} replace /> : <Login onLogin={handleLogin} />} 
        />
        <Route 
          path="/staff/login" 
          element={user ? <Navigate to={getRedirectPath(user)} replace /> : <StaffLogin onLogin={handleLogin} />} 
        />
        <Route 
          path="/admin/login" 
          element={user ? <Navigate to={getRedirectPath(user)} replace /> : <AdminLogin onLogin={handleLogin} />} 
        />

        {/* Account Module */}
        <Route path="/account" element={<AccountLayout user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />}>
          <Route index element={user ? <Navigate to="book" replace /> : <Navigate to="/login" />} />
          <Route path="overview" element={<AccountOverview />} />
          <Route path="book" element={<InternalCatalog />} />
          <Route path="profile" element={<CustomerProfile />} />
          <Route path="orders" element={<CustomerOrders />} />
          <Route path="orders/:orderId" element={<CustomerOrderDetail />} />
          <Route path="ledger" element={<CustomerLedger />} />
          <Route path="addresses" element={<CustomerAddresses />} />
          <Route path="referral" element={<ReferralPage />} />
        </Route>

        <Route 
          path="/staff" 
          element={
            user && (user.role === UserRole.STAFF || user.role === UserRole.GODOWN_KEEPER)
              ? <StaffDashboard user={user} onLogout={handleLogout} /> 
              : <Navigate to="/staff/login" replace />
          } 
        />

        <Route 
          path="/management/*" 
          element={
            user && [UserRole.ADMIN, UserRole.SUBADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT].includes(user.role)
              ? <Layout user={user} onLogout={handleLogout}>
                <Routes>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="catalog" element={<AdminCatalog />} />
                  <Route path="gatepass" element={<GatePassList />} />
                  <Route path="gatepass/:id" element={<GatePassDetail />} />
                  <Route path="gatepass/create" element={<CreateGatePass />} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="customers/:customerId/pricing" element={<AdminCustomerPricing />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="billing" element={<Billing />} />
                  <Route path="credits" element={<AdminCredits />} />
                  <Route path="tickets" element={<Tickets />} />
                  <Route path="admin/tutorials" element={<AdminTutorials />} />
                  <Route path="admin/gallery" element={<AdminGallery />} />
                  <Route path="admin/products" element={<AdminProducts />} />
                  <Route path="admin/settings" element={<AdminSettings />} />
                  <Route path="branding" element={<BrandingSettings />} />
                  <Route path="admin/subadmins" element={<AdminSubadmins />} />
                  <Route path="admin/stores" element={<AdminStores />} />
                  <Route path="admin/whatsapp" element={<WhatsAppCenter />} />
                  <Route path="admin/whatsapp/logs" element={<WhatsAppLogs />} />
                  <Route path="admin/contact" element={<AdminContactInbox />} />
                  <Route path="admin/sap" element={<SapDashboard />} />
                  <Route path="admin/notifications" element={<AdminNotifications />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </Layout>
              : <Navigate to="/admin/login" replace />
          } 
        />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
