"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Clapperboard, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { APP_NAME, ORGANIZATION_NAME } from "@/lib/branding";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-background p-4">Loading...</main>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "Vaishvik.Patel@hsapssWindsor.ca", password: "" }
  });

  async function onSubmit(values: LoginForm) {
    setLoading(true);
    const result = await signIn("credentials", {
      redirect: false,
      email: values.email,
      password: values.password
    });
    setLoading(false);

    if (result?.error) {
      const message =
        result.error === "CredentialsSignin"
          ? "Invalid admin credentials"
          : decodeURIComponent(result.error);
      toast.error(message);
      return;
    }

    router.push(getSafeCallbackPath(searchParams.get("callbackUrl")));
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-primary/15 shadow-xl">
        <CardHeader>
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Clapperboard className="h-6 w-6" />
          </div>
          <CardTitle>{ORGANIZATION_NAME}</CardTitle>
          <CardDescription>{APP_NAME} administrator sign in.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
              {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
            </div>
            <Button className="w-full" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              Sign in
            </Button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">
            Generate the hash with <code>node -e &quot;require(&apos;bcrypt&apos;).hash(&apos;yourpass&apos;,10).then(console.log)&quot;</code> and set ADMIN_PASSWORD_HASH.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

function getSafeCallbackPath(value: string | null) {
  if (!value) return "/dashboard";
  if (value.startsWith("/")) return value;

  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}${url.hash}` || "/dashboard";
  } catch {
    return "/dashboard";
  }
}
