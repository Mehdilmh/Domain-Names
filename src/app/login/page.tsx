import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signIn, auth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_NAME } from "@/config/app";

export const metadata: Metadata = { title: "Sign in" };

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
const emailEnabled = Boolean(process.env.EMAIL_SERVER);
const devEnabled = process.env.NODE_ENV !== "production";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/portfolio");

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Sign in to {APP_NAME}</CardTitle>
          <CardDescription>Start with 25 free credits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {googleEnabled && (
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/portfolio" });
              }}
            >
              <Button variant="ghost" className="w-full" type="submit">
                Continue with Google
              </Button>
            </form>
          )}

          {emailEnabled && (
            <form
              action={async (formData: FormData) => {
                "use server";
                await signIn("nodemailer", {
                  email: String(formData.get("email")),
                  redirectTo: "/portfolio",
                });
              }}
              className="space-y-2"
            >
              <Input name="email" type="email" placeholder="you@example.com" required />
              <Button className="w-full" type="submit">
                Email me a magic link
              </Button>
            </form>
          )}

          {devEnabled && (
            <form
              action={async (formData: FormData) => {
                "use server";
                await signIn("dev", {
                  email: String(formData.get("email")),
                  redirectTo: "/portfolio",
                });
              }}
              className="space-y-2"
            >
              {(googleEnabled || emailEnabled) && (
                <div className="relative py-2 text-center text-xs text-muted-foreground">
                  <span className="bg-surface px-2">dev sign-in (no keys required)</span>
                </div>
              )}
              <Input name="email" type="email" placeholder="you@example.com" required />
              <Button className="w-full" type="submit">
                Continue (dev)
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Development mode: sign in with any email, no password.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
