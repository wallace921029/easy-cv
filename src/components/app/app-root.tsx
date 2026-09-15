import { RouterProvider } from "react-router";
import { useI18n } from "./i18n-provider";
import { Toaster } from "@/components/ui/toast";
import { DynamicBackground } from "./dynamic-background";
import { router } from "@/router";

export function AppRoot() {
  const { resolvedLanguage } = useI18n();

  return (
    <Toaster key={resolvedLanguage}>
      <DynamicBackground />
      <RouterProvider router={router} />
    </Toaster>
  );
}
