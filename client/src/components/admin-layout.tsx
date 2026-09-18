import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [, setLocation] = useLocation();

  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/admin/login");
    }
  }, [isLoading, user, setLocation]);

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout");
      queryClient.setQueryData(["/api/user"], null);
      setLocation("/admin/login");
    } catch {
      setLocation("/admin/login");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background" data-testid="status-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const style = {
    "--sidebar-width": "16rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full" data-testid="container-admin-layout">
        <AdminSidebar user={user} onLogout={handleLogout} />
        <div className="flex flex-col flex-1 min-w-0">
          <header
            className="flex items-center justify-between gap-4 border-b px-4 h-14 shrink-0"
            data-testid="header-admin"
          >
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" data-testid="button-notifications">
                <Bell className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8" data-testid="img-header-avatar">
                  <AvatarFallback className="text-xs">
                    {user?.name?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || user?.phone?.charAt(0)?.toUpperCase() || "A"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden md:inline" data-testid="text-header-username">
                  {user?.name || user?.username || user?.phone || "User"}
                </span>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6" data-testid="main-admin-content">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
