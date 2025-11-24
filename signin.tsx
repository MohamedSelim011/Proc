"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Building2, Mail, KeySquare, ArrowRight, Shield } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/apiFetch";

export default function SignInPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const rememberedEmail = localStorage.getItem("wujha-remembered-email");
    if (rememberedEmail) {
      setFormData((prev) => ({ ...prev, email: rememberedEmail, remember: true }));
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (formData.remember) {
      localStorage.setItem("wujha-remembered-email", formData.email);
    } else {
      localStorage.removeItem("wujha-remembered-email");
    }

    setIsLoading(true);
    try {
      const response = await apiFetch("/api/auth/signin", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          data?.error?.message ??
          (response.status === 401
            ? "Invalid email or password"
            : "Unable to sign in. Please try again.");
        showToast("error", errorMessage);
        return;
      }

      // Store user data and token in localStorage
      if (data?.token) {
        localStorage.setItem("token", data.token);
        console.log('✅ Token stored in localStorage');
      } else {
        console.warn('⚠️ No token received from API');
      }
      
      if (data?.user) {
        const role = data.user.role || 'REQUESTOR'; // Fallback if role is null
        localStorage.setItem("role", role);
        console.log('✅ Role stored in localStorage:', role);
        
        const userData = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: role,
          department: data.user.department,
          employeeId: data.user.employeeId,
        };
        localStorage.setItem("user", JSON.stringify(userData));
        console.log('✅ User data stored in localStorage:', userData);
      } else {
        console.warn('⚠️ No user data received from API');
      }

      showToast("success", `Welcome back, ${data?.user?.name ?? "finance leader"}!`);

      const destination = typeof data?.homePath === "string" ? data.homePath : "/dashboard";
      router.push(destination);
      router.refresh();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Unexpected error during sign in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Background Image Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('/wujha-bg.webp')`,
        }}
      >
        {/* Dark overlay for better text contrast */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/50"></div>
      </div>

      {/* Left Side - Welcome Section */}
      <div className="hidden lg:flex lg:w-2/3 relative z-10 flex-col justify-center text-white px-24 py-24">
        <div>
          <div className="flex items-center gap-8 mb-20">
            <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/20">
              <Building2 className="w-12 h-12 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-5xl font-bold tracking-tight">
                Wujha Financial
              </h1>
              <p className="text-lg text-white/80 font-medium">
                Enterprise Resource Planning
              </p>
            </div>
          </div>

          <div className="max-w-2xl">
            <h2 className="text-8xl font-bold leading-tight mb-10">
              Welcome<br />Back
            </h2>
            <p className="text-2xl text-white/80 leading-relaxed">
              Access your financial management dashboard. Secure, compliant, and designed for enterprise excellence.
            </p>
          </div>
        </div>

      </div>

      {/* Right Side - Sign In Form */}
      <div className="flex-1 flex items-center justify-center px-10 py-20 relative z-10">
        <div className="w-full max-w-xl">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-5 mb-12">
            <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20">
              <Building2 className="w-9 h-9 text-white" />
            </div>
            <div className="text-white">
              <h1 className="text-4xl font-bold">Wujha Financial</h1>
              <p className="text-lg text-white/80">Enterprise ERP</p>
            </div>
          </div>

          {/* Sign In Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-16 border border-white/20">
            <div className="mb-12">
              <h3 className="text-4xl font-bold text-gray-900 mb-4">Sign in</h3>
              <p className="text-lg text-gray-600">
                Enter your credentials to access your account
              </p>
            </div>

            <form className="space-y-8" onSubmit={handleSubmit} noValidate>
              {/* Email Input */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-lg font-semibold text-gray-700"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-7 h-7 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full rounded-xl border-2 border-gray-200 bg-white pl-16 pr-6 py-5 text-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all placeholder:text-gray-400"
                    placeholder="your.email@company.com"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-lg font-semibold text-gray-700"
                >
                  Password
                </label>
                <div className="relative">
                  <KeySquare className="absolute left-6 top-1/2 -translate-y-1/2 w-7 h-7 text-gray-400" />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full rounded-xl border-2 border-gray-200 bg-white pl-16 pr-6 py-5 text-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all placeholder:text-gray-400"
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              {/* <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.remember}
                    onChange={(e) =>
                      setFormData({ ...formData, remember: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-lg text-gray-700 font-medium">Remember Me</span>
                </label>
                <button
                  type="button"
                  className="text-lg text-orange-600 hover:text-orange-700 font-semibold transition-colors"
                >
                  Lost your password?
                </button>
              </div> */}

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white font-semibold py-5 text-xl rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-orange-500/30 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
              >
                {isLoading ? (
                  <>
                    <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in now
                    <ArrowRight className="w-7 h-7" />
                  </>
                )}
              </button>

              {/* Terms Notice */}
              {/* <p className="text-base text-center text-gray-500 leading-relaxed">
                By clicking on "Sign in now" you agree to{" "}
                <button className="text-orange-600 hover:underline font-medium">
                  Terms of Service
                </button>
                {" "}|{" "}
                <button className="text-orange-600 hover:underline font-medium">
                  Privacy Policy
                </button>
              </p> */}
            </form>
          </div>

          {/* Security Badge */}
          <div className="mt-10 flex items-center justify-center gap-4 text-white/80">
            <Shield className="w-6 h-6" />
            <p className="text-lg">
              <span className="font-semibold text-white">Secured by SSL Encryption</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}