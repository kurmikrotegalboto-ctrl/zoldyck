"use client";

import { useState } from "react";
import { Lock, Eye, EyeOff, LogIn, ShieldAlert, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || locked) return;
    
    setLoading(true);
    setError("");
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 detik timeout
      
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const data = await res.json();

      if (res.ok) {
        window.location.href = "/";
      } else if (res.status === 429) {
        setLocked(true);
        setError(data.error || "Akun terkunci. Coba lagi dalam 15 menit.");
      } else {
        setError(data.error || "Login gagal");
        if (data.remainingAttempts !== undefined) {
          setRemaining(data.remainingAttempts);
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Koneksi timeout. Periksa jaringan internet lalu coba lagi.");
      } else {
        setError("Terjadi kesalahan koneksi. Coba lagi dalam beberapa detik.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-emerald-600 px-8 py-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">ZOLDYCK</h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-4">
            {error && (
              <div className={`border rounded-lg px-4 py-3 text-sm flex items-start gap-2 ${
                locked 
                  ? "bg-amber-50 border-amber-200 text-amber-800" 
                  : "bg-red-50 border-red-200 text-red-700"
              }`}>
                {locked ? <Clock className="h-4 w-4 mt-0.5 shrink-0" /> : <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />}
                <span>{error}</span>
              </div>
            )}

            {remaining !== null && remaining < 5 && !locked && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg px-3 py-2 text-center">
                Sisa percobaan: <strong>{remaining}</strong> kali. Setelah itu akun akan terkunci 15 menit.
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setRemaining(null); }}
                  placeholder="Masukkan username"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent pl-10"
                  autoFocus
                  disabled={locked}
                  autoComplete="username"
                />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setRemaining(null); }}
                  placeholder="Masukkan password"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent pr-10 pl-10"
                  disabled={locked}
                  autoComplete="current-password"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !username.trim() || !password.trim() || locked}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memproses...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Masuk
                </div>
              )}
            </Button>

            <p className="text-[11px] text-gray-400 text-center mt-4">
              Hubungi admin untuk mendapatkan akses
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}