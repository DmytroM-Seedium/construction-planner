import React from "react";
import ReactDOM from "react-dom/client";
import { AppRouter } from "./app/router";
import "./app/styles.css";

const redirectToErrorPage = (error: unknown) => {
  try {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Unexpected error";
    const stack = error instanceof Error ? error.stack : undefined;
    window.history.replaceState({ message, stack }, "", "/error");
    window.dispatchEvent(new PopStateEvent("popstate"));
  } catch {
    window.location.href = "/error";
  }
};

window.addEventListener("unhandledrejection", (event) => {
  redirectToErrorPage(event.reason);
});

window.addEventListener("error", (event) => {
  redirectToErrorPage(event.error ?? event.message);
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);
