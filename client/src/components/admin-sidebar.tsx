import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Receipt,
  Truck,
  Ticket,
  Box,
  Store,
  Settings,
  Flame,
  LogOut,
  Shield,
  FolderTree,
  BarChart3,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { User } from "@shared/schema";

const navItems = [
  { title: "Dashboard", url: "/management/dashboard", icon: LayoutDashboard },
  { title: "Inventory", url: "/management/inventory", icon: Package },
  { title: "Customers", url: "/management/customers", icon: Users },
  { title: "Orders", url: "/management/orders", icon: ShoppingCart },
  { title: "Billing", url: "/management/billing", icon: Receipt },
  { title: "Gate Pass", url: "/management/gatepass", icon: Truck },
  { title: "Tickets", url: "/management/tickets", icon: Ticket },
  { title: "Products", url: "/management/products", icon: Box },
  { title: "Categories", url: "/management/categories", icon: FolderTree },
  { title: "Stores", url: "/management/stores", icon: Store },
  { title: "Reports", url: "/management/reports", icon: BarChart3 },
  { title: "Staff & Roles", url: "/management/staff-roles", icon: Shield },
  { title: "Settings", url: "/management/settings", icon: Settings },
];

interface AdminSidebarProps {
  user?: User | null;
  onLogout?: () => void;
}

export function AdminSidebar({ user, onLogout }: AdminSidebarProps) {
  const [location] = useLocation();

  return (
    <Sidebar data-testid="sidebar-admin">
      <SidebarHeader className="p-4">
        <Link href="/management/dashboard" data-testid="link-sidebar-brand">
          <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-foreground">Bachan Gas</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url || location.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      data-testid={`link-sidebar-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        {user && (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8" data-testid="img-sidebar-avatar">
              <AvatarFallback className="text-xs">
                {user?.name?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || user?.phone?.charAt(0)?.toUpperCase() || "A"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" data-testid="text-sidebar-username">
                {user?.name || user?.username || user?.phone || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate" data-testid="text-sidebar-role">
                {user.role}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              data-testid="button-sidebar-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
