import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  Settings, 
  LogOut, 
  LogIn,
  Flame, 
  Truck,
  FileText,
  Menu,
  X,
  UserCircle,
  CreditCard
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: 'admin' | 'staff' | 'customer';
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const storedPhone = typeof window !== "undefined" ? localStorage.getItem("customer_phone") : null;
  const isLoggedIn = !!user || !!storedPhone;

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("customer_phone");
    }
    logout();
    window.location.href = "/";
  };

  // Define navigation items based on role
  const getNavItems = () => {
    switch (role) {
      case 'admin':
        return [
          { href: "/management/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { href: "/management/inventory", label: "Inventory", icon: Package },
          { href: "/management/orders", label: "Orders", icon: ShoppingCart },
          { href: "/management/customers", label: "Customers", icon: Users },
          { href: "/management/gate-passes", label: "Gate Passes", icon: Truck },
          { href: "/management/reports", label: "Reports", icon: FileText },
        ];
      case 'staff':
        return [
          { href: "/staff/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { href: "/staff/orders", label: "Deliveries", icon: Truck },
          { href: "/staff/inventory", label: "Stock Check", icon: Package },
        ];
      case 'customer':
        return [
          { href: "/account/overview", label: "Overview", icon: LayoutDashboard },
          { href: "/account/book-refill", label: "Book Cylinder", icon: Flame },
          { href: "/account/make-a-payment", label: "Pay Online", icon: CreditCard },
          { href: "/account/history", label: "Order History", icon: ShoppingCart },
          { href: "/account/profile", label: "Profile", icon: UserCircle },
        ];
      default: 
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-white/5 transform transition-transform duration-200 ease-in-out lg:transform-none flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2">
            <div className="rounded-full bg-primary/10 p-1.5">
              <Flame className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Indane<span className="text-primary">Gas</span>
            </span>
          </Link>
          <button 
            className="ml-auto lg:hidden text-muted-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group cursor-pointer",
                location === item.href 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              )}>
                <item.icon className={cn("h-5 w-5", location === item.href ? "text-primary-foreground" : "text-muted-foreground group-hover:text-white")} />
                {item.label}
              </div>
            </Link>
          ))}
        </div>

        <div className="p-4 border-t border-white/5">
          {isLoggedIn ? (
            <>
              <div className="flex items-center gap-3 px-3 mb-4">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white font-bold shadow-inner">
                  {(user?.name || user?.username || user?.phone || storedPhone || 'User').charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white truncate w-32">{user?.name || user?.phone || user?.username || storedPhone || 'User'}</span>
                  <span className="text-xs text-muted-foreground capitalize">{role}</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-3">
                <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-muted-foreground">
                  <UserCircle className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">Guest Customer</span>
                  <span className="text-xs text-muted-foreground">Not signed in</span>
                </div>
              </div>
              <Link href="/login">
                <Button 
                  className="w-full justify-start gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In / OTP
                </Button>
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 border-b border-white/5 bg-card flex items-center px-4 justify-between sticky top-0 z-30">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
          <span className="font-semibold text-white">
            {navItems.find(i => i.href === location)?.label || 'Dashboard'}
          </span>
          <div className="w-10" /> {/* Spacer for balance */}
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 bg-background scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  );
}
