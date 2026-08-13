"use client";

import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import { useState } from "react";
import { Shield, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [portal, setPortal] = useState<"admin" | "product">("product");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await signIn("email", {
      email,
      redirect: false,
      callbackUrl: "/dashboard",
    });
    if (!result?.error) setEmailSent(true);
    setLoading(false);
  };

  const handleGoogleRegister = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  if (emailSent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent a magic link to <strong>{email}</strong>. Click to activate your account.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{portal === "admin" ? "Platform admin access" : "Create your chatbot workspace"}</CardTitle>
        <CardDescription>{portal === "admin" ? "Admin accounts are provisioned for the SupportIQ team." : "Create, customize, and monitor chatbots for your business."}</CardDescription>
      </CardHeader>
      <div className="px-6 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setPortal("admin")} className={`rounded-lg border p-3 text-left ${portal === "admin" ? "border-indigo-600 bg-indigo-50" : "border-gray-200"}`}>
          <Shield className="h-4 w-4 mb-1 text-indigo-600" /><span className="text-sm font-semibold block">Platform Admin</span><span className="text-xs text-gray-500">Manage the service</span>
        </button>
        <button type="button" onClick={() => setPortal("product")} className={`rounded-lg border p-3 text-left ${portal === "product" ? "border-indigo-600 bg-indigo-50" : "border-gray-200"}`}>
          <MessageCircle className="h-4 w-4 mb-1 text-indigo-600" /><span className="text-sm font-semibold block">Product User</span><span className="text-xs text-gray-500">Manage your chatbot</span>
        </button>
      </div>
      {portal === "admin" ? (
        <CardContent className="space-y-4 pt-5">
          <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">Platform admin accounts are not created through public registration.</div>
          <Link href="/login?portal=admin" className="block"><Button className="w-full">Go to admin login</Button></Link>
        </CardContent>
      ) : (
      <CardContent className="space-y-4">
        <Button
          onClick={handleGoogleRegister}
          variant="outline"
          className="w-full"
          disabled={loading}
        >
          Continue with Google
        </Button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
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
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Sending..." : "Create Account"}
          </Button>
        </form>
      </CardContent>
      )}
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-600 hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
