"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [credentialsError, setCredentialsError] = useState<string | null>(null);

    const handleCredentialsLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setCredentialsError(null);

        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (result?.error) {
            setCredentialsError("Invalid email or password");
            setIsLoading(false);
        } else {
            // Fetch session to get user role for redirect
            const session = await getSession();
            if (session?.user?.role === "ADMIN") {
                window.location.href = "/admin/payouts";
            } else {
                window.location.href = "/dashboard";
            }
        }
    };

    const handleGoogleLogin = () => {
        // For Google, we redirect to dashboard and let the page handle role-based redirect
        signIn("google", { callbackUrl: "/dashboard" });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Commission Calculator</CardTitle>
                    <CardDescription>Sign in to access your dashboard</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Error messages */}
                    {error === "unauthorized" && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                            You don&apos;t have permission to access that page.
                        </div>
                    )}

                    {/* Google OAuth */}
                    <Button
                        variant="outline"
                        className="w-full h-12 gap-3"
                        onClick={handleGoogleLogin}
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Sign in with Google
                    </Button>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                or continue with email
                            </span>
                        </div>
                    </div>

                    {/* Credentials form */}
                    <form onSubmit={handleCredentialsLogin} className="space-y-4">
                        {credentialsError && (
                            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                                {credentialsError}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                "Sign in"
                            )}
                        </Button>
                    </form>

                    {/* Demo credentials hint */}
                    <div className="text-center text-xs text-muted-foreground">
                        <p>Demo: admin@company.com / admin123 (Admin)</p>
                        <p>Demo: jane.smith@company.com / rep123 (Rep)</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
