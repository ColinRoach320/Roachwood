import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const { error, redirect: redirectTo } = await searchParams;

  return (
    <div className="min-h-screen flex flex-col">
      <div className="mx-auto w-full max-w-6xl px-6 py-6">
        <Logo />
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center">
            <p className="rw-eyebrow">Welcome back</p>
            <h1 className="rw-display mt-3 text-3xl">Sign in</h1>
            <p className="mt-2 text-sm text-charcoal-400">
              Roach Wood client &amp; team portal.
            </p>
          </div>

          <form action={signIn} className="rw-card mt-8 p-8 space-y-5">
            {redirectTo ? (
              <input type="hidden" name="redirect" value={redirectTo} />
            ) : null}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoFocus />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>

            {error ? (
              <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            ) : null}

            <Button type="submit" size="lg" className="w-full">
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-charcoal-400">
            New client?{" "}
            <Link href="/#contact" className="rw-link">
              Reach out
            </Link>{" "}
            and we&apos;ll set you up.
          </p>
        </div>
      </div>
    </div>
  );
}
