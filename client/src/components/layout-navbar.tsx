import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { UserRole } from "@shared/schema";
import { Flame, Menu, X, ShoppingCart, User as UserIcon, LogOut } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SiteSettings } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ["/api/settings"],
  });

  const isActive = (path: string) => location === path;

  const showLogo = settings?.showLogo ?? true;
  const showSiteName = settings?.showSiteName ?? true;
  const siteName = settings?.siteName || "Bachan Gas Service";
  const logoUrl = settings?.logoUrl;

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/products", label: "Products" },
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact Us" },
    { href: "/make-a-payment", label: "Pay Online" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group cursor-pointer" data-testid="link-brand">
            {showLogo && logoUrl ? (
              <img
                src={logoUrl}
                alt={siteName}
                className="h-8 w-8 rounded-md object-contain"
                data-testid="img-navbar-logo"
              />
            ) : showLogo ? (
              <div className="rounded-full bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
                <Flame className="h-6 w-6 text-primary" />
              </div>
            ) : null}
            {showSiteName && (
              <span className="text-xl font-bold tracking-tight text-white group-hover:text-primary transition-colors" data-testid="text-navbar-name">
                {siteName}
              </span>
            )}
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive(link.href) ? "text-primary" : "text-muted-foreground"
                }`}
                data-testid={`link-nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                 <Link href="/account/history">
                   <Button variant="ghost" size="icon" className="relative text-muted-foreground" data-testid="button-cart">
                     <ShoppingCart className="h-5 w-5" />
                   </Button>
                 </Link>

                 <DropdownMenu>
                   <DropdownMenuTrigger asChild>
                     <Button variant="ghost" className="gap-2 px-2 hover:bg-white/5">
                       <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                         {(user?.name || user?.username || user?.phone || "User").charAt(0).toUpperCase()}
                       </div>
                       <span className="text-sm font-medium text-white">{user.username}</span>
                     </Button>
                   </DropdownMenuTrigger>
                   <DropdownMenuContent align="end" className="w-56 bg-card border-white/10 text-white">
                     <DropdownMenuLabel>My Account</DropdownMenuLabel>
                     <DropdownMenuSeparator className="bg-white/10" />
                     {user.role === UserRole.ADMIN || user.role === UserRole.SUBADMIN || user.role === UserRole.MANAGER ? (
                       <DropdownMenuItem asChild className="cursor-pointer hover:bg-white/5 focus:bg-white/5">
                         <Link href="/management/dashboard">Admin Dashboard</Link>
                       </DropdownMenuItem>
                     ) : user.role === UserRole.STAFF || user.role === UserRole.GODOWN_KEEPER || user.role === UserRole.ACCOUNTANT ? (
                       <DropdownMenuItem asChild className="cursor-pointer hover:bg-white/5 focus:bg-white/5">
                         <Link href="/staff/dashboard">Staff Dashboard</Link>
                       </DropdownMenuItem>
                     ) : (
                       <DropdownMenuItem asChild className="cursor-pointer hover:bg-white/5 focus:bg-white/5">
                         <Link href="/account/overview">Customer Dashboard</Link>
                       </DropdownMenuItem>
                     )}
                     <DropdownMenuItem asChild className="cursor-pointer hover:bg-white/5 focus:bg-white/5">
                        <Link href="/account/profile">Profile Settings</Link>
                     </DropdownMenuItem>
                     <DropdownMenuSeparator className="bg-white/10" />
                     <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-red-400 hover:text-red-300 hover:bg-white/5 focus:bg-white/5">
                       <LogOut className="mr-2 h-4 w-4" />
                       <span>Log out</span>
                     </DropdownMenuItem>
                   </DropdownMenuContent>
                 </DropdownMenu>
              </div>
            ) : (
              <Link href="/login">
                <Button className="bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20">
                  Login / Sign Up
                </Button>
              </Link>
            )}
          </div>

          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} data-testid="button-mobile-menu">
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-card p-4 space-y-4 animate-in slide-in-from-top-5">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isActive(link.href) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-white"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="border-t border-white/10 pt-4">
             {user ? (
                <div className="space-y-2">
                   <div className="flex items-center gap-3 px-4 mb-3">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                         {(user?.name || user?.username || user?.phone || "User").charAt(0).toUpperCase()}
                       </div>
                       <span className="font-medium text-white">{user.name || user.phone || user.username || "User"}</span>
                   </div>
                   <Button onClick={() => logout()} variant="destructive" className="w-full justify-start">
                      <LogOut className="mr-2 h-4 w-4" /> Log out
                   </Button>
                </div>
             ) : (
               <Link href="/login">
                 <Button className="w-full">Login / Sign Up</Button>
               </Link>
             )}
          </div>
        </div>
      )}
    </nav>
  );
}
