import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/auth-login";
import AdminLoginPage from "@/pages/admin-login";
import AboutPage from "@/pages/about";
import ContactPage from "@/pages/contact";
import PaymentSuccessPage from "@/pages/payment-success";
import PaymentFailurePage from "@/pages/payment-failure";
import { DirectPaymentCustomer, DirectPaymentPublic } from "@/pages/direct-payment";

import CustomerDashboard from "@/pages/customer-dashboard";
import CustomerBookRefill from "@/pages/customer-book";
import CustomerHistory from "@/pages/customer-history";
import CustomerProfile from "@/pages/customer-profile";
import ProductsListingPage from "@/pages/products-listing";
import ProductDetailsPage from "@/pages/product-details";

import DeliveryDashboard from "@/pages/delivery-dashboard";
import GatekeeperDashboard from "@/pages/gatekeeper-dashboard";
import AccountantDashboard from "@/pages/accountant-dashboard";

import { AdminLayout } from "@/components/admin-layout";
import Dashboard from "@/pages/management/dashboard";
import InventoryPage from "@/pages/management/inventory";
import CustomersPage from "@/pages/management/customers";
import OrdersPage from "@/pages/management/orders";
import BillingPage from "@/pages/management/billing";
import GatePassPage from "@/pages/management/gatepass";
import TicketsPage from "@/pages/management/tickets";
import ProductsPage from "@/pages/management/products";
import StoresPage from "@/pages/management/stores";
import SettingsPage from "@/pages/management/settings";
import StaffRolesPage from "@/pages/management/staff-roles";
import CategoriesPage from "@/pages/management/categories";
import ReportsPage from "@/pages/management/reports";

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/admin/login" component={AdminLoginPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/products" component={ProductsListingPage} />
      <Route path="/product/:id" component={ProductDetailsPage} />
      <Route path="/payment/success" component={PaymentSuccessPage} />
      <Route path="/payment/failure" component={PaymentFailurePage} />
      <Route path="/make-a-payment" component={DirectPaymentPublic} />

      <Route path="/account/overview" component={CustomerDashboard} />
      <Route path="/account/book-refill" component={CustomerBookRefill} />
      <Route path="/account/history" component={CustomerHistory} />
      <Route path="/account/profile" component={CustomerProfile} />
      <Route path="/account/make-a-payment" component={DirectPaymentCustomer} />

      <Route path="/delivery/dashboard" component={DeliveryDashboard} />
      <Route path="/gatekeeper/dashboard" component={GatekeeperDashboard} />
      <Route path="/accountant/dashboard" component={AccountantDashboard} />

      <Route path="/management/:page*">
        {(params) => (
          <AdminLayout>
            <Switch>
              <Route path="/management/dashboard" component={Dashboard} />
              <Route path="/management/inventory" component={InventoryPage} />
              <Route path="/management/customers" component={CustomersPage} />
              <Route path="/management/orders" component={OrdersPage} />
              <Route path="/management/billing" component={BillingPage} />
              <Route path="/management/gatepass" component={GatePassPage} />
              <Route path="/management/tickets" component={TicketsPage} />
              <Route path="/management/products" component={ProductsPage} />
              <Route path="/management/categories" component={CategoriesPage} />
              <Route path="/management/stores" component={StoresPage} />
              <Route path="/management/settings" component={SettingsPage} />
              <Route path="/management/reports" component={ReportsPage} />
              <Route path="/management/staff-roles" component={StaffRolesPage} />
              <Route>
                <Dashboard />
              </Route>
            </Switch>
          </AdminLayout>
        )}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
