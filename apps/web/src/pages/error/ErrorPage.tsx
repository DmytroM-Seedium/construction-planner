import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ErrorLocationState = {
  message?: string;
  stack?: string;
  returnPath?: string;
};

type Props = {
  /** When set, values override `location.state` (e.g. error boundary). */
  inline?: ErrorLocationState;
};

export const ErrorPage = ({ inline }: Props = {}) => {
  const location = useLocation();
  const state: ErrorLocationState = {
    ...((location.state ?? {}) as ErrorLocationState),
    ...inline,
  };

  return (
    <main className="flex h-full items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The app hit an unexpected error. You can return to the login screen or
            reload the page you were on.
          </p>

          {(state.message || state.stack) && (
            <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs leading-relaxed">
              {state.message ?? "Unknown error"}
              {state.stack ? `\n\n${state.stack}` : ""}
            </pre>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                window.location.assign("/");
              }}
            >
              Go to login
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const target =
                  state.returnPath && state.returnPath !== "/error"
                    ? state.returnPath
                    : "/";
                window.location.assign(target);
              }}
            >
              Reload
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

