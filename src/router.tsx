import { createBrowserRouter, Navigate } from "react-router";
import { RouteGuard } from "@/components/app/route-guard";
import AdminPage from "@/pages/admin";
import HomePage from "@/pages/home";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import SettingsPage from "@/pages/settings";
import SetupPage from "@/pages/setup";

export const router = createBrowserRouter([
  {
    path: "/setup",
    element: (
      <RouteGuard kind="setup">
        <SetupPage />
      </RouteGuard>
    ),
  },
  {
    path: "/login",
    element: (
      <RouteGuard kind="auth">
        <LoginPage />
      </RouteGuard>
    ),
  },
  {
    path: "/register",
    element: (
      <RouteGuard kind="auth">
        <RegisterPage />
      </RouteGuard>
    ),
  },
  {
    path: "/",
    element: (
      <RouteGuard kind="user">
        <HomePage />
      </RouteGuard>
    ),
  },
  {
    path: "/settings",
    element: (
      <RouteGuard kind="user">
        <SettingsPage />
      </RouteGuard>
    ),
  },
  {
    path: "/admin",
    element: (
      <RouteGuard kind="admin">
        <AdminPage />
      </RouteGuard>
    ),
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
