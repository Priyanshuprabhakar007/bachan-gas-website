import { DashboardLayout } from "@/components/layout-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserCircle, Save, Phone, Mail, MapPin, Flame } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export default function CustomerProfile() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
      });
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof profile) => {
      const res = await apiRequest("PATCH", "/api/profile", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Profile updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (!profile.name.trim()) {
      toast({ title: "Error", description: "Name is required", variant: "destructive" });
      return;
    }
    updateMutation.mutate(profile);
  };

  return (
    <DashboardLayout role="customer">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">My Profile</h1>
          <p className="text-muted-foreground mt-1">View and update your account details.</p>
        </div>

        <Card className="border-white/10 bg-card/50">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {user?.name?.charAt(0) || "U"}
              </div>
              <div>
                <CardTitle>{user?.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Flame className="h-3.5 w-3.5 text-primary" />
                  Consumer ID: {user?.consumerId || "Not assigned"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-1">
                <UserCircle className="h-3.5 w-3.5" /> Full Name
              </Label>
              <Input
                id="name"
                data-testid="input-profile-name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> Phone Number
              </Label>
              <Input
                id="phone"
                data-testid="input-profile-phone"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> Email Address
              </Label>
              <Input
                id="email"
                data-testid="input-profile-email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="your@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> Delivery Address
              </Label>
              <Textarea
                id="address"
                data-testid="input-profile-address"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="Your delivery address"
                rows={3}
              />
            </div>

            <Button
              data-testid="button-save-profile"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg">Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Username</span>
                <span className="font-mono" data-testid="text-username">{user?.username}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Consumer ID</span>
                <span className="font-mono" data-testid="text-consumer-id">{user?.consumerId || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Account Type</span>
                <span className="capitalize" data-testid="text-role">{user?.role}</span>
              </div>
              {user?.createdAt && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Member Since</span>
                  <span data-testid="text-member-since">
                    {new Date(user.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long" })}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
