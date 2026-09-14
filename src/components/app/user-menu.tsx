import { useState } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LogOutIcon,
  SettingsIcon,
  ShieldIcon,
  UserIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { strings } from "@/lib/strings";
import { useMe } from "@/queries/auth";
import { useTheme, type Theme } from "./theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const me = useMe().data;
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="gap-1.5" aria-label={strings.settings.title} />}
      >
        <UserIcon className="size-4" />
        <span className="max-w-32 truncate">{me?.username}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{me?.username}</DropdownMenuLabel>
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
          <DropdownMenuRadioItem value="dark">{strings.settings.themeDark}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={loggingOut} onClick={() => void logout()}>
          <LogOutIcon />
          {strings.auth.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
