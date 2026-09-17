import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Flame, Loader2, ArrowLeft } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { useQuery } from "@tanstack/react-query";
import { insertUserSchema, UserRole } from "@shared/schema";

const registerSchema = insertUserSchema.extend({
  email: z.string().optional(),
  phone: z.string().optional(),
  consumerId: z.string().optional(),
  confirmPassword: z.string().min(1, "Please confirm password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register, isRegistering, user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: googleAuth } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/auth/google/enabled"],
  });

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      name: "",
      email: "",
      phone: "",
      consumerId: "",
      role: UserRole.CUSTOMER, // Default role
    },
  });

  if (user) {
    setLocation("/account/overview");
    return null;
  }

  const onSubmit = (data: RegisterFormData) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { confirmPassword, ...userData } = data;
    register(userData, {
        onSuccess: () => setLocation("/login")
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
         <div className="mb-6">
           <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
           </Link>
         </div>

         <Card className="border-white/10 bg-card/50 backdrop-blur-sm shadow-xl">
           <CardHeader className="text-center space-y-2 border-b border-white/5 pb-6">
             <div className="mx-auto rounded-full bg-primary/10 p-3 w-fit mb-2">
               <Flame className="h-8 w-8 text-primary" />
             </div>
             <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
             <CardDescription>
               Join Indane Gas Agency for seamless cylinder booking
             </CardDescription>
           </CardHeader>
           <CardContent className="pt-6">
             {googleAuth?.enabled && (
               <>
                 <a href="/auth/google" className="block" data-testid="button-google-signup">
                   <Button
                     type="button"
                     variant="outline"
                     className="w-full border-white/10 bg-background/50"
                     asChild
                   >
                     <span>
                       <SiGoogle className="mr-2 h-4 w-4" />
                       Sign up with Google
                     </span>
                   </Button>
                 </a>

                 <div className="relative my-6">
                   <div className="absolute inset-0 flex items-center">
                     <span className="w-full border-t border-white/10" />
                   </div>
                   <div className="relative flex justify-center text-xs uppercase">
                     <span className="bg-card px-2 text-muted-foreground">Or register with</span>
                   </div>
                 </div>
               </>
             )}

             <Form {...form}>
               <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                 
                 <div className="grid md:grid-cols-2 gap-4">
                   <FormField
                     control={form.control}
                     name="name"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Full Name</FormLabel>
                         <FormControl>
                           <Input placeholder="John Doe" {...field} className="bg-background/50" />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                   <FormField
                     control={form.control}
                     name="username"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Username</FormLabel>
                         <FormControl>
                           <Input placeholder="johndoe123" {...field} className="bg-background/50" />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                 </div>

                 <div className="grid md:grid-cols-2 gap-4">
                   <FormField
                     control={form.control}
                     name="email"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Email</FormLabel>
                         <FormControl>
                           <Input type="email" placeholder="john@example.com" {...field} className="bg-background/50" />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                   <FormField
                     control={form.control}
                     name="phone"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Phone Number</FormLabel>
                         <FormControl>
                           <Input type="tel" placeholder="9876543210" {...field} className="bg-background/50" />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                 </div>

                 <FormField
                   control={form.control}
                   name="consumerId"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Consumer ID (Optional)</FormLabel>
                       <FormControl>
                         <Input placeholder="Enter your consumer number if you have one" {...field} className="bg-background/50" />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />

                 <div className="grid md:grid-cols-2 gap-4">
                   <FormField
                     control={form.control}
                     name="password"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Password</FormLabel>
                         <FormControl>
                           <Input type="password" placeholder="Create a password" {...field} className="bg-background/50" />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                   <FormField
                     control={form.control}
                     name="confirmPassword"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Confirm Password</FormLabel>
                         <FormControl>
                           <Input type="password" placeholder="Confirm your password" {...field} className="bg-background/50" />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                 </div>

                 <Button 
                   type="submit" 
                   className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base shadow-lg shadow-primary/20 mt-4" 
                   disabled={isRegistering}
                 >
                   {isRegistering ? (
                     <>
                       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                       Creating account...
                     </>
                   ) : (
                     "Sign Up"
                   )}
                 </Button>
               </form>
             </Form>

             <div className="mt-6 text-center text-sm">
               <span className="text-muted-foreground">Already have an account? </span>
               <Link href="/login" className="text-primary hover:underline font-medium">
                 Sign In
               </Link>
             </div>
           </CardContent>
         </Card>
      </div>
    </div>
  );
}
