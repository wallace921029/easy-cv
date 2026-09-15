import { useState } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LanguagesIcon,
  LogOutIcon,
  SettingsIcon,
  ShieldIcon,
  SunMoonIcon,
  UserIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "@/lib/api";
import { strings } from "@/lib/strings";
import { useMe } from "@/queries/auth";
import { useTheme, type Theme } from "./theme-provider";
import { useI18n, type Language } from "./i18n-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({ size = "default" }: { size?: "default" | "sm" } = {}) {
  const me = useMe().data;
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useI18n();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [open, setOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const logout = async () => {
    setLoggingOut(true);
    try {
      await api.auth.logout();
    } catch {
      // Local state is cleared either way.
    }
    queryClient.clear();
    navigate("/login", { replace: true });
  };

  const isExpanded = isHovered || open;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size={isExpanded ? size : (size === "sm" ? "icon-sm" : "icon")}
            aria-label={strings.settings.title}
            onPointerEnter={(e) => {
              if (e.pointerType === "mouse") setIsHovered(true);
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === "mouse") setIsHovered(false);
            }}
            className="overflow-hidden transition-[width,padding,gap] duration-300 ease-out select-none"
          />
        }
      >
        <UserIcon className="size-4 shrink-0" />
        <AnimatePresence initial={false}>
          {isExpanded && me?.username && (
            <motion.span
              key="username"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{
                width: { type: "spring", stiffness: 450, damping: 32 },
                opacity: { duration: 0.18 },
              }}
              className="max-w-32 truncate overflow-hidden whitespace-nowrap text-sm font-medium"
            >
              {me.username}
            </motion.span>
          )}
        </AnimatePresence>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-auto min-w-max whitespace-nowrap"
        finalFocus={(closeType) => closeType === "keyboard"}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>{me?.username}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/settings")}>
          <SettingsIcon />
          {strings.settings.title}
        </DropdownMenuItem>
        {me?.role === "admin" ? (
          <DropdownMenuItem onClick={() => navigate("/admin")}>
            <ShieldIcon />
            {strings.admin.title}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <SunMoonIcon />
            {strings.settings.appearance}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-auto min-w-max whitespace-nowrap">
            <DropdownMenuRadioGroup
              value={theme}
              onValueChange={(value) => setTheme(value as Theme)}
            >
              <DropdownMenuRadioItem value="system">
                {strings.settings.themeSystem}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="light">
                {strings.settings.themeLight}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                {strings.settings.themeDark}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <LanguagesIcon />
            {strings.settings.language}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-auto min-w-max whitespace-nowrap">
            <DropdownMenuRadioGroup
              value={language}
              onValueChange={(value) => setLanguage(value as Language)}
            >
              <DropdownMenuRadioItem value="system">
                {strings.settings.langSystem}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="zh">
                {strings.settings.langZh}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="en">
                {strings.settings.langEn}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={loggingOut} onClick={() => void logout()}>
          <LogOutIcon />
          {strings.auth.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
