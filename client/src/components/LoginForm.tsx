import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { User, Lock, Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    
    try {
      // Since we're using Replit Auth, we redirect to the OAuth flow
      // In a real implementation, this would validate credentials with bcrypt
      toast({
        title: "Redirecting to login...",
        description: "You will be redirected to complete authentication.",
      });
      
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1000);
    } catch (error) {
      toast({
        title: "Authentication Failed",
        description: "Invalid username or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Username Field */}
        <div>
          <Label htmlFor="username" className="block text-sm font-semibold text-dark-charcoal mb-2">
            Username
          </Label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-steel-gray w-5 h-5" />
            <Input
              id="username"
              type="text"
              {...register("username")}
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-industrial-blue focus:ring-2 focus:ring-blue-100 outline-none transition-all text-lg"
              placeholder="Enter your username"
              data-testid="input-username"
            />
          </div>
          {errors.username && (
            <div className="text-error-red text-sm mt-1" data-testid="error-username">
              {errors.username.message}
            </div>
          )}
        </div>

        {/* Password Field */}
        <div>
          <Label htmlFor="password" className="block text-sm font-semibold text-dark-charcoal mb-2">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-steel-gray w-5 h-5" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              {...register("password")}
              className="w-full pl-12 pr-12 py-4 border-2 border-gray-200 rounded-xl focus:border-industrial-blue focus:ring-2 focus:ring-blue-100 outline-none transition-all text-lg"
              placeholder="Enter your password"
              data-testid="input-password"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-steel-gray hover:text-dark-charcoal transition-colors"
              onClick={() => setShowPassword(!showPassword)}
              data-testid="button-toggle-password"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </Button>
          </div>
          {errors.password && (
            <div className="text-error-red text-sm mt-1" data-testid="error-password">
              {errors.password.message}
            </div>
          )}
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="rememberMe"
              {...register("rememberMe")}
              data-testid="checkbox-remember-me"
            />
            <Label
              htmlFor="rememberMe"
              className="text-sm font-medium text-steel-gray cursor-pointer"
            >
              Remember me
            </Label>
          </div>
          <Button
            type="button"
            variant="link"
            className="text-sm font-semibold text-industrial-blue hover:text-blue-800 transition-colors p-0"
            data-testid="link-forgot-password"
          >
            Forgot password?
          </Button>
        </div>

        {/* Login Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 px-6 bg-industrial-blue text-white font-bold text-lg rounded-xl hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="button-sign-in"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Signing In...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>
    </div>
  );
}
