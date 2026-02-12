"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hexagon, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get("role") || "admin"; // Defaulting to Admin for the "High Fidelity" preview
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const email = (document.getElementById('email') as HTMLInputElement).value;
    const password = (document.getElementById('password') as HTMLInputElement).value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.user.role === 'admin') router.push('/dashboard');
        else router.push('/attendance');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] relative overflow-hidden">

      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#13ec6d]/20 rounded-full blur-[128px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#13ec6d]/10 rounded-full blur-[128px] opacity-20 pointer-events-none" />

      <div className="w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-[#13ec6d] rounded-2xl mx-auto flex items-center justify-center shadow-[0_0_40px_rgba(19,236,109,0.3)] mb-6">
            <Hexagon className="h-8 w-8 text-black fill-black" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Absensi Fajar</h1>
          <p className="text-zinc-400">Welcome back, please login to your account.</p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500 group-focus-within:text-[#13ec6d] transition-colors" />
                <Input
                  id="email"
                  placeholder="admin@company.com"
                  className="pl-10 h-11 bg-zinc-950/50 border-zinc-800 focus:border-[#13ec6d] focus:ring-[#13ec6d] transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <a href="#" className="text-xs text-[#13ec6d] hover:underline">Forgot Password?</a>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500 group-focus-within:text-[#13ec6d] transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11 bg-zinc-950/50 border-zinc-800 focus:border-[#13ec6d] focus:ring-[#13ec6d] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-zinc-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              className="w-full h-11 bg-[#13ec6d] text-black font-bold text-base hover:bg-[#13ec6d] hover:shadow-[0_0_20px_rgba(19,236,109,0.4)] transition-all transform hover:-translate-y-0.5"
              disabled={loading}
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : "Log In"}
            </Button>
          </form>
        </div>

        <p className="text-center text-zinc-500 text-sm mt-8">
          © {new Date().getFullYear()} Absensi Fajar System
        </p>
      </div>
    </div>
  );
}
