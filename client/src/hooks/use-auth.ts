import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { InsertUser } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { sendOtpWithLogging, verifyOtpWithLogging } from "@/lib/auth-service";
import { resolveUrl, authFetch } from "@/lib/queryClient";

export function useAuth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const userQuery = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await authFetch(api.auth.me.path);
      if (res.status === 401) {
        localStorage.removeItem("auth_token");
        return null;
      }
      if (!res.ok) throw new Error("Failed to fetch user");
      return api.auth.me.responses[200].parse(await res.json());
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { username: string; password: string }) => {
      const res = await authFetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Invalid credentials");
        throw new Error("Login failed");
      }
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }
      return api.auth.login.responses[200].parse(data);
    },
    onSuccess: (user) => {
      queryClient.setQueryData([api.auth.me.path], user);
      toast({ title: "Welcome back!", description: `Logged in as ${user.name}` });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Login failed", description: error.message });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const res = await authFetch(api.auth.register.path, {
        method: api.auth.register.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Registration failed");
      }
      return api.auth.register.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Account created! Please login." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await authFetch(api.auth.logout.path, { method: api.auth.logout.method });
      localStorage.removeItem("auth_token");
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      queryClient.setQueryData([api.orders.list.path], []);
      toast({ title: "Logged out", description: "See you soon!" });
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: async (phone: string) => {
      return await sendOtpWithLogging(phone);
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ phone, code }: { phone: string; code: string }) => {
      return await verifyOtpWithLogging(phone, code);
    },
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }
      queryClient.setQueryData([api.auth.me.path], data.user);
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      if (data.user?.phone) {
        localStorage.setItem("customer_phone", data.user.phone);
      }
      toast({ title: "Welcome!", description: "You have been logged in successfully" });
    },
  });

  return {
    user: userQuery.data,
    isLoading: userQuery.isLoading,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutate,
    isRegistering: registerMutation.isPending,
    logout: logoutMutation.mutate,
    sendOtp: sendOtpMutation.mutateAsync,
    isSendingOtp: sendOtpMutation.isPending,
    verifyOtp: verifyOtpMutation.mutateAsync,
    verifyOTP: verifyOtpMutation.mutateAsync,
    isVerifyingOtp: verifyOtpMutation.isPending,
    isVerifyingOTP: verifyOtpMutation.isPending,
  };
}
