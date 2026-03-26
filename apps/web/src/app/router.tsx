import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppErrorBoundary } from "@/app/AppErrorBoundary";
import { SyncBootstrap } from "@/processes/sync/SyncBootstrap";
import { ErrorPage } from "@/pages/error/ErrorPage";
import { HomePage } from "@/pages/home/HomePage";
import { ProjectsPage } from "@/pages/projects/ProjectsPage";

export const AppRouter = () => (
  <BrowserRouter>
    <SyncBootstrap>
      <AppErrorBoundary>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/error" element={<ErrorPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AppErrorBoundary>
    </SyncBootstrap>
  </BrowserRouter>
);
