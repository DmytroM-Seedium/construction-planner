import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { loginByName } from "@/features/auth/loginByName";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export const HomePage = () => {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await loginByName(name);
      setIsSubmitting(false);
      navigate("/projects");
    } catch (error) {
      setIsSubmitting(false);
      setError(
        error instanceof Error
          ? error.message
          : "Login failed. Make sure server is reachable once to issue a token.",
      );
    }
  };

  return (
    <main className="relative flex h-full items-center justify-center p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1000px_circle_at_20%_0%,hsl(var(--accent))_0%,transparent_45%),radial-gradient(800px_circle_at_90%_20%,hsl(var(--muted))_0%,transparent_55%)]" />

      <form onSubmit={onSubmit} className="relative w-full max-w-md">
        <Card className="border-border/80 bg-card/80 backdrop-blur">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl ">Construction Planner</CardTitle>
            <CardDescription>
              Sign in with a name to open your projects.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field>
              <FieldLabel htmlFor="login-name">Name</FieldLabel>
              <Input
                id="login-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex"
                required
                disabled={isSubmitting}
              />
            </Field>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              className="w-full py-5"
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </CardContent>
        </Card>
      </form>
    </main>
  );
};
