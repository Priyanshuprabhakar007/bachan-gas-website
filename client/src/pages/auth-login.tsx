import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Flame, Loader2, ArrowLeft, Phone, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function LoginPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const isSendingRef = useRef(false);
  const isVerifyingRef = useRef(false);

  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    if (user) {
      const urlParams = new URLSearchParams(window.location.search);
      const redirectPath = urlParams.get("redirect");
      if (redirectPath) {
        const redirectParams = new URLSearchParams();
        const amount = urlParams.get("amount");
        const purpose = urlParams.get("purpose");
        if (amount) redirectParams.set("amount", amount);
        if (purpose) redirectParams.set("purpose", purpose);
        const redirectUrl = redirectParams.toString()
          ? `${redirectPath}?${redirectParams.toString()}`
          : redirectPath;
        setLocation(redirectUrl);
      } else {
        const role = user.role?.toUpperCase();
        if (role === "CUSTOMER") setLocation("/account/overview");
        else if (role === "DELIVERY_MAN") setLocation("/delivery/dashboard");
        else if (role === "GATE_KEEPER") setLocation("/gatekeeper/dashboard");
        else if (role === "ACCOUNTANT") setLocation("/accountant/dashboard");
        else setLocation("/management/dashboard");
      }
    }
  }, [user, setLocation]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const formatPhoneForDisplay = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length <= 2) return `+${digits}`;
    if (digits.length <= 7) return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
    return `+${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7, 12)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^\d+]/g, "");
    if (!val.startsWith("+91")) val = "+91" + val.replace(/^\+?91?/, "");
    setPhone(val);
  };

  const getE164Phone = () => {
    return phone.replace(/\s/g, "");
  };

  const sendOtp = async () => {
    if (isSendingRef.current) return;
    const e164 = getE164Phone();
    if (!/^\+\d{10,15}$/.test(e164)) {
      toast({ variant: "destructive", title: "Invalid phone number", description: "Enter a valid phone with country code (e.g., +919876543210)" });
      return;
    }

    isSendingRef.current = true;
    setIsSending(true);
    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: e164 }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        let errorDesc = data.message || "Failed to send OTP via SMS";
        
        // Handle Twilio specific codes
        if (data.code === 21608) {
          errorDesc = "This is a Twilio trial account. The recipient's phone number must be verified in the Twilio Console before trying again.";
        } else if (data.code === 20003 || data.code === 70051) {
          errorDesc = "Twilio credentials configured on Netlify are invalid. Please check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.";
        } else if (data.code === 60200) {
          errorDesc = "The phone number is in an invalid format. Ensure it follows E.164 format (e.g., +917004204745).";
        } else if (data.code === 60203) {
          errorDesc = "Too many OTP attempts have been sent to this number. Please try again later.";
        } else if (data.message?.includes("Missing") || data.message?.includes("invalid TWILIO")) {
          errorDesc = `${data.message} Please check that TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID are configured in Netlify Settings.`;
        }

        toast({ 
          variant: "destructive", 
          title: "Failed to Send OTP", 
          description: errorDesc 
        });
        return;
      }
      setDevOtp(data.devOtp || null);
      setStep("otp");
      setResendCooldown(60);
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => otpRefs[0].current?.focus(), 100);
      toast({
        title: "OTP Sent",
        description: data.devOtp
          ? `Preview code generated: ${data.devOtp}`
          : "Please check your SMS for the verification code",
      });
    } catch {
      toast({ variant: "destructive", title: "Network Error", description: "Could not reach the server. Please try again." });
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  };

  const verifyOtp = useCallback(async (otpCode: string) => {
    if (isVerifyingRef.current) return;
    const e164 = phone.replace(/\s/g, "");
    isVerifyingRef.current = true;
    setIsVerifying(true);
    try {
      const res = await fetch("/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: e164, code: otpCode }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", title: "Verification Failed", description: data.message || "Invalid OTP" });
        setOtp(["", "", "", "", "", ""]);
        otpRefs[0].current?.focus();
        return;
      }
      queryClient.setQueryData(["/api/user"], data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      if (data.user?.phone) {
        localStorage.setItem("customer_phone", data.user.phone);
      }
      toast({ title: "Welcome!", description: "You have been logged in successfully" });
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Network error. Please try again." });
    } finally {
      isVerifyingRef.current = false;
      setIsVerifying(false);
    }
  }, [phone, toast]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs[index + 1].current?.focus();
    }

    const fullCode = newOtp.join("");
    if (fullCode.length === 6 && newOtp.every(d => d !== "")) {
      verifyOtp(fullCode);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      const newOtp = ["", "", "", "", "", ""];
      for (let i = 0; i < pasted.length && i < 6; i++) {
        newOtp[i] = pasted[i];
      }
      setOtp(newOtp);
      if (pasted.length === 6) {
        verifyOtp(pasted);
      } else {
        otpRefs[Math.min(pasted.length, 5)].current?.focus();
      }
    }
  };

  if (user) return null;

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-card relative overflow-hidden border-r border-white/5">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/20 via-background to-background opacity-50 pointer-events-none" />
        
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 mb-12 w-fit">
            <div className="rounded-full bg-primary/10 p-2">
              <Flame className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Indane Gas</span>
          </Link>
          
          <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
            Manage your <br />
            <span className="text-primary">LPG connection</span> <br />
            with ease.
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            Login with your phone number to book refills, track deliveries, and manage your gas connection effortlessly.
          </p>
        </div>

        <div className="relative z-10 text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Indane Gas Agency System
        </div>
      </div>

      <div className="flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-8">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
          </Link>

          <Card className="border-white/10 bg-card/50 backdrop-blur-sm shadow-xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center" data-testid="text-login-title">
                {step === "phone" ? "Login / Sign Up" : "Enter OTP"}
              </CardTitle>
              <CardDescription className="text-center">
                {step === "phone"
                  ? "Enter your phone number to receive a verification code via SMS"
                  : `We sent an SMS code to ${formatPhoneForDisplay(phone)}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {step === "phone" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="phone-input">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone-input"
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={phone}
                        onChange={handlePhoneChange}
                        onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                        className="pl-10 bg-background/50 border-white/10 focus:border-primary/50 transition-colors"
                        data-testid="input-phone"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Include country code (e.g., +91 for India)</p>
                  </div>

                  <Button
                    onClick={sendOtp}
                    disabled={isSending || phone.replace(/\D/g, "").length < 10}
                    className="w-full bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20"
                    data-testid="button-send-otp"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending OTP...
                      </>
                    ) : (
                      <>
                        Login via SMS
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Verification Code</label>
                    <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                      {otp.map((digit, i) => (
                        <Input
                          key={i}
                          ref={otpRefs[i]}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          className="w-14 h-14 text-center text-2xl font-bold bg-background/50 border-white/10 focus:border-primary/50 transition-colors"
                          data-testid={`input-otp-${i}`}
                          disabled={isVerifying}
                        />
                      ))}
                    </div>
                  </div>

                  {devOtp && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                      <div>
                        <span className="text-amber-400 font-medium">Test OTP:</span>{" "}
                        <span className="font-mono text-sm font-bold text-foreground ml-1 tracking-widest">{devOtp}</span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 px-2"
                        onClick={() => {
                          const digits = devOtp.split("").slice(0, 6);
                          setOtp(digits);
                          verifyOtp(devOtp);
                        }}
                      >
                        Auto-fill & Login
                      </Button>
                    </div>
                  )}

                  <Button
                    onClick={() => verifyOtp(otp.join(""))}
                    disabled={isVerifying || otp.join("").length < 6}
                    className="w-full bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/20"
                    data-testid="button-verify-otp"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify & Login"
                    )}
                  </Button>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => { setStep("phone"); setOtp(["", "", "", "", "", ""]); }}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      data-testid="button-change-phone"
                    >
                      Change number
                    </button>
                    <button
                      type="button"
                      onClick={sendOtp}
                      disabled={resendCooldown > 0 || isSending}
                      className={`transition-colors ${resendCooldown > 0 ? "text-muted-foreground/50 cursor-not-allowed" : "text-primary hover:text-primary/80"}`}
                      data-testid="button-resend-otp"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
