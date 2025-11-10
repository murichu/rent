import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiClient } from "../config/api";
import loggingService from "../services/loggingService";
import toastService from "../services/toastService";

const Login = ({ setIsAuthenticated }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Log login attempt
    const correlationId = loggingService.logUserAction(
      "login_attempt",
      "Login",
      {
        email: email.replace(/(.{2}).*@/, "$1***@"), // Mask email for privacy
        timestamp: new Date().toISOString(),
      }
    );

    try {
      const response = await apiClient.post("/auth/login", {
        email,
        password,
      });

      if (response.data.token) {
        // Store authentication data
        localStorage.setItem("token", response.data.token);
        if (response.data.user) {
          localStorage.setItem("user", JSON.stringify(response.data.user));
        }
        if (response.data.refreshToken) {
          localStorage.setItem("refreshToken", response.data.refreshToken);
        }

        // Log successful login
        loggingService.logUserAction("login_success", "Login", {
          userId: response.data.user?.id,
          userRole: response.data.user?.role,
          correlationId,
        });

        // Log security event
        loggingService.logSecurity("user_login", {
          userId: response.data.user?.id,
          email: email.replace(/(.{2}).*@/, "$1***@"),
          correlationId,
        });

        // Show success message
        toastService.success("Welcome back! Login successful.", {
          title: "Login Successful",
          correlationId,
        });

        setIsAuthenticated(true);

        // Log navigation
        loggingService.logNavigation("/login", "/", "post_login_redirect");

        navigate("/");
      } else {
        // Log authentication failure
        loggingService.error("Login response missing token", {
          category: loggingService.LogCategories.API_ERROR,
          component: "Login",
          correlationId,
          responseData: response.data,
        });

        setError("Login failed. Invalid response from server.");
      }
    } catch (err) {
      // Log login error with context
      loggingService.logApiError(err, "/api/v1/auth/login", "POST");

      // Log security event for failed login
      loggingService.logSecurity("login_failed", {
        email: email.replace(/(.{2}).*@/, "$1***@"),
        error: err.response?.data?.error || err.message,
        statusCode: err.response?.status,
        correlationId,
      });

      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Login failed. Please try again.";

      setError(errorMessage);

      // Show error toast
      toastService.error(errorMessage, {
        title: "Login Failed",
        correlationId,
        retryable: err.response?.status >= 500,
        onRetry: () => handleSubmit(e),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to Haven</CardTitle>
          <CardDescription>
            Enter your credentials to access your property management dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@acme.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
