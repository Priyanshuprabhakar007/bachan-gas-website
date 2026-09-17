import { useState } from "react";
import { Navbar } from "@/components/layout-navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Phone, Mail, MapPin, Clock, MessageCircle, Send, Flame } from "lucide-react";
import type { SiteSettings } from "@shared/schema";

export default function ContactPage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    inquiryType: "Domestic",
    message: "",
    _website: "",
  });

  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ["/api/settings"],
  });

  const contactMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/contact", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Message sent!", description: "We'll get back to you soon." });
      setFormData({ name: "", phone: "", email: "", inquiryType: "Domestic", message: "", _website: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    contactMutation.mutate(formData);
  };

  const siteName = settings?.siteName || "Bachan Gas Service";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background py-16 sm:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4" data-testid="text-contact-title">
            Contact Us
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Have questions about our services? Reach out and we'll be happy to help.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16 -mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-1 space-y-6">
            <Card data-testid="card-contact-info">
              <CardHeader>
                <div className="flex items-center gap-3">
                  {settings?.showLogo && settings?.logoUrl ? (
                    <img src={settings.logoUrl} alt={siteName} className="h-10 w-10 rounded-md object-contain" />
                  ) : (
                    <div className="rounded-full bg-primary/10 p-2">
                      <Flame className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg" data-testid="text-business-name">{siteName}</CardTitle>
                    {settings?.tagline && (
                      <p className="text-sm text-muted-foreground">{settings.tagline}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {settings?.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <a href={`tel:${settings.phone}`} className="text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-phone">
                        {settings.phone}
                      </a>
                    </div>
                  </div>
                )}
                {settings?.whatsapp && (
                  <div className="flex items-start gap-3">
                    <MessageCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">WhatsApp</p>
                      <a
                        href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-green-500 transition-colors"
                        data-testid="link-whatsapp"
                      >
                        {settings.whatsapp}
                      </a>
                    </div>
                  </div>
                )}
                {settings?.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <a href={`mailto:${settings.email}`} className="text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="link-email">
                        {settings.email}
                      </a>
                    </div>
                  </div>
                )}
                {settings?.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Address</p>
                      <p className="text-sm text-muted-foreground" data-testid="text-address">{settings.address}</p>
                    </div>
                  </div>
                )}
                {settings?.workingHours && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Working Hours</p>
                      <p className="text-sm text-muted-foreground" data-testid="text-hours">{settings.workingHours}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card data-testid="card-contact-form">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  Send us a Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="sr-only" aria-hidden="true">
                    <Label htmlFor="_website">Website</Label>
                    <Input
                      id="_website"
                      name="_website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={formData._website}
                      onChange={(e) => setFormData({ ...formData, _website: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        data-testid="input-contact-name"
                        placeholder="Your full name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        data-testid="input-contact-phone"
                        placeholder="+91 98765 43210"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email (optional)</Label>
                      <Input
                        id="email"
                        data-testid="input-contact-email"
                        type="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inquiryType">Inquiry Type</Label>
                      <Select
                        value={formData.inquiryType}
                        onValueChange={(val) => setFormData({ ...formData, inquiryType: val })}
                      >
                        <SelectTrigger data-testid="select-inquiry-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Domestic">Domestic</SelectItem>
                          <SelectItem value="Commercial">Commercial</SelectItem>
                          <SelectItem value="Safety Parts">Safety Parts</SelectItem>
                          <SelectItem value="Complaint">Complaint</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      data-testid="input-contact-message"
                      placeholder="Tell us how we can help you..."
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>

                  <Button
                    type="submit"
                    data-testid="button-submit-contact"
                    disabled={contactMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    {contactMutation.isPending ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {settings?.googleMapsEmbedUrl && (
          <div className="mt-8" data-testid="section-map">
            <Card>
              <CardContent className="p-0 overflow-hidden rounded-md">
                <iframe
                  src={settings.googleMapsEmbedUrl}
                  width="100%"
                  height="400"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Location Map"
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
