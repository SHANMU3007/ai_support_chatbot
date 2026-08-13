"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, MessageCircle } from "lucide-react";

export default function LoginPage() {
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [portal, setPortal] = useState<"admin" | "product">("product");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlError = new URLSearchParams(window.location.search).get("error");
      if (urlError) {
        if (urlError === "Callback" || urlError === "OAuthCallback") {
          setError(
            "Google sign-in failed. Please verify that NEXTAUTH_URL, GOOGLE_CLIENT_ID, and GOOGLE_CLIENT_SECRET are set in Vercel, and that Authorized Redirect URIs are configured in Google Cloud Console."
          );
        } else if (urlError === "OAuthAccountNotLinked") {
          setError("An account with this email exists using a different sign-in method.");
        } else {
          setError(`Authentication error: ${urlError}`);
        }
      }
    }
  }, []);

  if (session) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Switch Account</CardTitle>
          <CardDescription>
            You are currently logged in as <strong>{session.user?.email}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => signOut({ callbackUrl: "/login" })} className="w-full">
            Sign out and switch account
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getCallbackUrl = () => {
    const fallback = portal === "admin" ? "/admin" : "/dashboard";
    const value = new URLSearchParams(window.location.search).get("callbackUrl");
    if (!value) return fallback;

    try {
      const callbackUrl = new URL(value, window.location.origin);
      return callbackUrl.origin === window.location.origin
        ? `${callbackUrl.pathname}${callbackUrl.search}${callbackUrl.hash}`
        : fallback;
    } catch {
      return fallback;
    }
  };

  const startLogin = async (provider: string, options: Record<string, string>) => {
    setLoading(true);
    setError("");
    await signIn(provider, options);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      
      const result = await signIn("email", {
        email,
        redirect: false,
        callbackUrl: getCallbackUrl(),
      });
      if (result?.error) {
        setError("Failed to send login email. Please try again.");
      } else {
        setEmailSent(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await startLogin("google", { callbackUrl: getCallbackUrl() });
  };

  if (emailSent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a magic link to <strong>{email}</strong>. Click the link to sign in.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{portal === "admin" ? "Platform admin login" : "Product user login"}</CardTitle>
        <CardDescription>{portal === "admin" ? "Monitor all customer workspaces and service usage." : "Manage your chatbots, conversations, and usage analytics."}</CardDescription>
      </CardHeader>
      <div className="px-6 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setPortal("admin")} className={`rounded-lg border p-3 text-left ${portal === "admin" ? "border-indigo-600 bg-indigo-50" : "border-gray-200"}`}>
          <Shield className="h-4 w-4 mb-1 text-indigo-600" /><span className="text-sm font-semibold block">Platform Admin</span><span className="text-xs text-gray-500">Service dashboard</span>
        </button>
        <button type="button" onClick={() => setPortal("product")} className={`rounded-lg border p-3 text-left ${portal === "product" ? "border-indigo-600 bg-indigo-50" : "border-gray-200"}`}>
          <MessageCircle className="h-4 w-4 mb-1 text-indigo-600" /><span className="text-sm font-semibold block">Product User</span><span className="text-xs text-gray-500">Your chatbot dashboard</span>
        </button>
      </div>
      <CardContent className="space-y-4">
        {portal === "product" && <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">Sign in to create and edit your chatbot, upload knowledge, review conversations, and monitor usage.</div>}
        <Button
          onClick={handleGoogleLogin}
          variant="outline"
          className="w-full"
          disabled={loading}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Send Magic Link"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-indigo-600 hover:underline">
            Sign up free
          </Link>
        </p>
      </CardFooter>
      <div className="px-6 pb-5 text-center">
        <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="text-xs text-gray-500 hover:text-indigo-600 hover:underline">
          Switch account
        </button>
      </div>
    </Card>
  );
}
