import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/image-upload";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Palette, Phone, Mail, MapPin, Clock, MessageCircle, Flame,
  Save, Eye, Inbox, CreditCard, Percent, IndianRupee, Video
} from "lucide-react";
import type { SiteSettings, ContactInquiry, PaymentTransaction } from "@shared/schema";

function formatCurrency(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(paise / 100);
}

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<SiteSettings>({
    queryKey: ["/api/admin/settings"],
  });

  const { data: inquiries } = useQuery<ContactInquiry[]>({
    queryKey: ["/api/admin/inquiries"],
  });

  const { data: transactions } = useQuery<PaymentTransaction[]>({
    queryKey: ["/api/admin/transactions"],
  });

  const [branding, setBranding] = useState({
    siteName: "Bachan Gas Service",
    tagline: "",
    logoUrl: "",
    showLogo: true,
    showSiteName: true,
  });

  const [contact, setContact] = useState({
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    workingHours: "",
    googleMapsEmbedUrl: "",
    supportMessageTemplate: "",
  });

  const [video, setVideo] = useState({
    homeVideoUrl: "",
    homeVideoTitle: "",
    showHomeVideo: true,
  });

  const [payment, setPayment] = useState({
    ccavenueEnabled: false,
    ccavenueFeeEnabled: true,
    ccavenueFeePercent: "0.25",
    ccavenueRoundingMode: "ROUND_2_DECIMALS",
  });

  useEffect(() => {
    if (settings) {
      setBranding({
        siteName: settings.siteName || "Bachan Gas Service",
        tagline: settings.tagline || "",
        logoUrl: settings.logoUrl || "",
        showLogo: settings.showLogo ?? true,
        showSiteName: settings.showSiteName ?? true,
      });
      setContact({
        phone: settings.phone || "",
        whatsapp: settings.whatsapp || "",
        email: settings.email || "",
        address: settings.address || "",
        workingHours: settings.workingHours || "",
        googleMapsEmbedUrl: settings.googleMapsEmbedUrl || "",
        supportMessageTemplate: settings.supportMessageTemplate || "",
      });
      setVideo({
        homeVideoUrl: settings.homeVideoUrl || "",
        homeVideoTitle: settings.homeVideoTitle || "",
        showHomeVideo: settings.showHomeVideo ?? true,
      });
      setPayment({
        ccavenueEnabled: settings.ccavenueEnabled ?? false,
        ccavenueFeeEnabled: settings.ccavenueFeeEnabled ?? true,
        ccavenueFeePercent: settings.ccavenueFeePercent || "0.25",
        ccavenueRoundingMode: settings.ccavenueRoundingMode || "ROUND_2_DECIMALS",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("PATCH", "/api/admin/settings", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Settings saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payment/settings"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateInquiryMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/inquiries/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/inquiries"] });
      toast({ title: "Inquiry updated" });
    },
  });

  const handleSaveBranding = () => {
    saveMutation.mutate({
      siteName: branding.siteName,
      tagline: branding.tagline || null,
      logoUrl: branding.logoUrl || null,
      showLogo: branding.showLogo,
      showSiteName: branding.showSiteName,
    });
  };

  const handleSaveContact = () => {
    saveMutation.mutate({
      phone: contact.phone || null,
      whatsapp: contact.whatsapp || null,
      email: contact.email || null,
      address: contact.address || null,
      workingHours: contact.workingHours || null,
      googleMapsEmbedUrl: contact.googleMapsEmbedUrl || null,
      supportMessageTemplate: contact.supportMessageTemplate || null,
    });
  };

  const handleSaveVideo = () => {
    saveMutation.mutate({
      homeVideoUrl: video.homeVideoUrl || null,
      homeVideoTitle: video.homeVideoTitle || null,
      showHomeVideo: video.showHomeVideo,
    });
  };

  const handleSavePayment = () => {
    const feeVal = parseFloat(payment.ccavenueFeePercent);
    if (isNaN(feeVal) || feeVal < 0 || feeVal > 5) {
      toast({ title: "Error", description: "Fee percentage must be between 0 and 5", variant: "destructive" });
      return;
    }
    saveMutation.mutate({
      ccavenueEnabled: payment.ccavenueEnabled,
      ccavenueFeeEnabled: payment.ccavenueFeeEnabled,
      ccavenueFeePercent: payment.ccavenueFeePercent,
      ccavenueRoundingMode: payment.ccavenueRoundingMode,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const newInquiriesCount = inquiries?.filter(i => i.status === "NEW").length || 0;

  const exampleBase = 252500;
  const exampleFeePercent = parseFloat(payment.ccavenueFeePercent) || 0.25;
  const exampleFeeRaw = exampleBase * (exampleFeePercent / 100);
  const exampleFee = payment.ccavenueRoundingMode === "ROUND_UP_TO_RUPEE"
    ? Math.ceil(exampleFeeRaw / 100) * 100
    : Math.round(exampleFeeRaw);
  const exampleTotal = payment.ccavenueFeeEnabled ? exampleBase + exampleFee : exampleBase;

  return (
    <div className="p-6 space-y-6" data-testid="settings-page">
      <h1 className="text-2xl font-semibold" data-testid="text-page-title">Settings</h1>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="branding" data-testid="tab-branding">
            <Palette className="h-4 w-4 mr-2" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="contact" data-testid="tab-contact">
            <Phone className="h-4 w-4 mr-2" />
            Contact Details
          </TabsTrigger>
          <TabsTrigger value="homepage" data-testid="tab-homepage">
            <Video className="h-4 w-4 mr-2" />
            Homepage
          </TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">
            <CreditCard className="h-4 w-4 mr-2" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="inquiries" data-testid="tab-inquiries" className="relative">
            <Inbox className="h-4 w-4 mr-2" />
            Inquiries
            {newInquiriesCount > 0 && (
              <Badge variant="destructive" className="ml-2">{newInquiriesCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="card-branding">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Palette className="h-5 w-5 text-muted-foreground" />
                  Website Branding
                </CardTitle>
                <CardDescription>Customize your website name, logo, and display options</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Website Name</Label>
                  <Input
                    id="siteName"
                    data-testid="input-site-name"
                    value={branding.siteName}
                    onChange={(e) => setBranding({ ...branding, siteName: e.target.value })}
                    placeholder="Bachan Gas Service"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline (optional)</Label>
                  <Input
                    id="tagline"
                    data-testid="input-tagline"
                    value={branding.tagline}
                    onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
                    placeholder="Reliable LPG Gas Distribution"
                  />
                </div>

                <ImageUpload
                  label="Logo"
                  value={branding.logoUrl || null}
                  onChange={(url) => setBranding({ ...branding, logoUrl: url || "" })}
                />

                <div className="space-y-4 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Label>Show Logo</Label>
                      <p className="text-sm text-muted-foreground">Display logo in navbar and branding areas</p>
                    </div>
                    <Switch
                      data-testid="switch-show-logo"
                      checked={branding.showLogo}
                      onCheckedChange={(checked) => setBranding({ ...branding, showLogo: checked })}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Label>Show Site Name</Label>
                      <p className="text-sm text-muted-foreground">Display website name text in navbar</p>
                    </div>
                    <Switch
                      data-testid="switch-show-name"
                      checked={branding.showSiteName}
                      onCheckedChange={(checked) => setBranding({ ...branding, showSiteName: checked })}
                    />
                  </div>
                </div>

                <Button
                  data-testid="button-save-branding"
                  onClick={handleSaveBranding}
                  disabled={saveMutation.isPending}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? "Saving..." : "Save Branding"}
                </Button>
              </CardContent>
            </Card>

            <Card data-testid="card-branding-preview">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                  Navbar Preview
                </CardTitle>
                <CardDescription>How your branding will appear in the navbar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border bg-background/80 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      {branding.showLogo && branding.logoUrl ? (
                        <img
                          src={branding.logoUrl}
                          alt="Logo preview"
                          className="h-8 w-8 rounded-md object-contain"
                          data-testid="img-logo-preview"
                        />
                      ) : branding.showLogo ? (
                        <div className="rounded-full bg-primary/10 p-1.5">
                          <Flame className="h-5 w-5 text-primary" />
                        </div>
                      ) : null}
                      {branding.showSiteName && (
                        <span className="font-bold text-white" data-testid="text-name-preview">
                          {branding.siteName || "Bachan Gas Service"}
                        </span>
                      )}
                      {!branding.showLogo && !branding.showSiteName && (
                        <span className="text-sm text-muted-foreground italic">Nothing will show</span>
                      )}
                    </div>
                    <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Home</span>
                      <span>Products</span>
                      <span>Contact</span>
                      <span>Login</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Current Configuration:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span>Logo</span>
                      <Badge variant={branding.showLogo ? "default" : "secondary"}>
                        {branding.showLogo ? "Visible" : "Hidden"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Site Name</span>
                      <Badge variant={branding.showSiteName ? "default" : "secondary"}>
                        {branding.showSiteName ? "Visible" : "Hidden"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Logo Uploaded</span>
                      <Badge variant={branding.logoUrl ? "default" : "secondary"}>
                        {branding.logoUrl ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="contact" className="space-y-6">
          <Card data-testid="card-contact-details">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-5 w-5 text-muted-foreground" />
                Contact Information
              </CardTitle>
              <CardDescription>These details appear on the Contact page, footer, and landing page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> Phone
                  </Label>
                  <Input
                    id="phone"
                    data-testid="input-settings-phone"
                    value={contact.phone}
                    onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                    placeholder="+91 98143 43443"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp" className="flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </Label>
                  <Input
                    id="whatsapp"
                    data-testid="input-settings-whatsapp"
                    value={contact.whatsapp}
                    onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })}
                    placeholder="+919814343443"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail" className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> Email
                </Label>
                <Input
                  id="contactEmail"
                  data-testid="input-settings-email"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  placeholder="info@bachangas.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> Address
                </Label>
                <Textarea
                  id="address"
                  data-testid="input-settings-address"
                  value={contact.address}
                  onChange={(e) => setContact({ ...contact, address: e.target.value })}
                  placeholder="Village Bulara, Alamgir Road, Ludhiana, Punjab"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workingHours" className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Working Hours
                </Label>
                <Input
                  id="workingHours"
                  data-testid="input-settings-hours"
                  value={contact.workingHours}
                  onChange={(e) => setContact({ ...contact, workingHours: e.target.value })}
                  placeholder="Mon - Sat: 8:00 AM - 8:00 PM"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mapUrl">Google Maps Embed URL</Label>
                <Input
                  id="mapUrl"
                  data-testid="input-settings-map"
                  value={contact.googleMapsEmbedUrl}
                  onChange={(e) => setContact({ ...contact, googleMapsEmbedUrl: e.target.value })}
                  placeholder="https://www.google.com/maps/embed?pb=..."
                />
                <p className="text-xs text-muted-foreground">Paste the iframe src URL from Google Maps embed code</p>
              </div>

              <Button
                data-testid="button-save-contact"
                onClick={handleSaveContact}
                disabled={saveMutation.isPending}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save Contact Details"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="homepage" className="space-y-6">
          <Card data-testid="card-video-settings">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Video className="h-5 w-5 text-muted-foreground" />
                Homepage Video
              </CardTitle>
              <CardDescription>Configure the YouTube video displayed on the homepage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Label>Show Video on Homepage</Label>
                  <p className="text-sm text-muted-foreground">Toggle the video section visibility on the public homepage</p>
                </div>
                <Switch
                  data-testid="switch-show-video"
                  checked={video.showHomeVideo}
                  onCheckedChange={(checked) => setVideo({ ...video, showHomeVideo: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="homeVideoUrl">YouTube Video URL</Label>
                <Input
                  id="homeVideoUrl"
                  data-testid="input-video-url"
                  value={video.homeVideoUrl}
                  onChange={(e) => setVideo({ ...video, homeVideoUrl: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                />
                <p className="text-xs text-muted-foreground">Supports youtube.com/watch, youtu.be, and youtube.com/embed formats</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="homeVideoTitle">Video Section Title</Label>
                <Input
                  id="homeVideoTitle"
                  data-testid="input-video-title"
                  value={video.homeVideoTitle}
                  onChange={(e) => setVideo({ ...video, homeVideoTitle: e.target.value })}
                  placeholder="Watch How We Deliver Safety to Your Doorstep"
                />
              </div>

              <Button
                data-testid="button-save-video"
                onClick={handleSaveVideo}
                disabled={saveMutation.isPending}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save Homepage Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="card-payment-settings">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  CCAvenue Payment Gateway
                </CardTitle>
                <CardDescription>Configure online payment options for your customers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Label>Enable CCAvenue Payments</Label>
                    <p className="text-sm text-muted-foreground">Allow customers to pay online via CCAvenue</p>
                  </div>
                  <Switch
                    data-testid="switch-ccavenue-enabled"
                    checked={payment.ccavenueEnabled}
                    onCheckedChange={(checked) => setPayment({ ...payment, ccavenueEnabled: checked })}
                  />
                </div>

                <div className="border-t border-border pt-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Label>Enable Convenience Fee</Label>
                      <p className="text-sm text-muted-foreground">Add a processing fee on CCAvenue payments</p>
                    </div>
                    <Switch
                      data-testid="switch-ccavenue-fee-enabled"
                      checked={payment.ccavenueFeeEnabled}
                      onCheckedChange={(checked) => setPayment({ ...payment, ccavenueFeeEnabled: checked })}
                    />
                  </div>

                  {payment.ccavenueFeeEnabled && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="feePercent" className="flex items-center gap-1">
                          <Percent className="h-3.5 w-3.5" /> Fee Percentage
                        </Label>
                        <Input
                          id="feePercent"
                          data-testid="input-fee-percent"
                          type="number"
                          step="0.01"
                          min="0"
                          max="5"
                          value={payment.ccavenueFeePercent}
                          onChange={(e) => setPayment({ ...payment, ccavenueFeePercent: e.target.value })}
                          placeholder="0.25"
                        />
                        <p className="text-xs text-muted-foreground">Range: 0% to 5%. Default is 0.25%</p>
                      </div>

                      <div className="space-y-2">
                        <Label>Rounding Mode</Label>
                        <Select
                          value={payment.ccavenueRoundingMode}
                          onValueChange={(val) => setPayment({ ...payment, ccavenueRoundingMode: val })}
                        >
                          <SelectTrigger data-testid="select-rounding-mode">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ROUND_2_DECIMALS">Round to 2 decimals (paise)</SelectItem>
                            <SelectItem value="ROUND_UP_TO_RUPEE">Round up to nearest rupee</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>

                <Button
                  data-testid="button-save-payments"
                  onClick={handleSavePayment}
                  disabled={saveMutation.isPending}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveMutation.isPending ? "Saving..." : "Save Payment Settings"}
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card data-testid="card-fee-preview">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <IndianRupee className="h-5 w-5 text-muted-foreground" />
                    Fee Calculation Preview
                  </CardTitle>
                  <CardDescription>Example for an order of {formatCurrency(exampleBase)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span>Order Amount</span>
                      <span className="font-mono" data-testid="text-preview-base">{formatCurrency(exampleBase)}</span>
                    </div>
                    {payment.ccavenueFeeEnabled && (
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span>CCAvenue Fee ({exampleFeePercent}%)</span>
                        <span className="font-mono text-primary" data-testid="text-preview-fee">{formatCurrency(exampleFee)}</span>
                      </div>
                    )}
                    <div className="border-t border-border pt-2 flex items-center justify-between gap-2 font-medium">
                      <span>Total Payable</span>
                      <span className="font-mono text-lg" data-testid="text-preview-total">{formatCurrency(exampleTotal)}</span>
                    </div>
                    {payment.ccavenueRoundingMode === "ROUND_UP_TO_RUPEE" && payment.ccavenueFeeEnabled && (
                      <p className="text-xs text-muted-foreground">Fee is rounded up to the nearest whole rupee</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-ccavenue-status">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    Gateway Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span>CCAvenue</span>
                      <Badge variant={payment.ccavenueEnabled ? "default" : "secondary"}>
                        {payment.ccavenueEnabled ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Convenience Fee</span>
                      <Badge variant={payment.ccavenueFeeEnabled ? "default" : "secondary"}>
                        {payment.ccavenueFeeEnabled ? `${exampleFeePercent}%` : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span>Rounding</span>
                      <Badge variant="outline">
                        {payment.ccavenueRoundingMode === "ROUND_UP_TO_RUPEE" ? "Round Up" : "2 Decimals"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {transactions && transactions.length > 0 && (
            <Card data-testid="card-recent-transactions">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-muted-foreground" />
                  Recent Transactions
                </CardTitle>
                <CardDescription>Latest payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {transactions.slice(0, 10).map((txn) => (
                    <div
                      key={txn.id}
                      className="border border-border rounded-md p-3 flex flex-wrap items-center justify-between gap-2"
                      data-testid={`card-transaction-${txn.id}`}
                    >
                      <div>
                        <p className="font-mono text-sm">{txn.merchantTxnId}</p>
                        <p className="text-xs text-muted-foreground">
                          Order #{txn.orderId} | {txn.createdAt ? new Date(txn.createdAt).toLocaleString() : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{formatCurrency(txn.totalAmountPaise)}</span>
                        <Badge variant={txn.status === "PAID" ? "default" : txn.status === "FAILED" ? "destructive" : "secondary"}>
                          {txn.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="inquiries" className="space-y-6">
          <Card data-testid="card-inquiries">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Inbox className="h-5 w-5 text-muted-foreground" />
                Contact Inquiries
              </CardTitle>
              <CardDescription>Messages received from the contact form</CardDescription>
            </CardHeader>
            <CardContent>
              {!inquiries || inquiries.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No inquiries yet</p>
              ) : (
                <div className="space-y-4">
                  {inquiries.map((inq) => (
                    <div
                      key={inq.id}
                      className="border border-border rounded-md p-4 space-y-3"
                      data-testid={`card-inquiry-${inq.id}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{inq.name}</p>
                          <p className="text-sm text-muted-foreground">{inq.phone} {inq.email ? `| ${inq.email}` : ""}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={inq.status === "NEW" ? "destructive" : inq.status === "IN_PROGRESS" ? "default" : "secondary"}>
                            {inq.status}
                          </Badge>
                          <Badge variant="outline">{inq.inquiryType}</Badge>
                        </div>
                      </div>
                      <p className="text-sm">{inq.message}</p>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {inq.createdAt ? new Date(inq.createdAt).toLocaleString() : ""}
                        </span>
                        <Select
                          value={inq.status}
                          onValueChange={(val) => updateInquiryMutation.mutate({ id: inq.id, status: val })}
                        >
                          <SelectTrigger className="w-[140px]" data-testid={`select-inquiry-status-${inq.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NEW">New</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="CLOSED">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
