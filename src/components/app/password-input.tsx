import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { strings } from "@/lib/strings";

export function PasswordInput({
  size = "default",
  ...props
}: React.ComponentProps<typeof InputGroupInput>) {
  const [visible, setVisible] = useState(false);
  return (
    <InputGroup size={size}>
      <InputGroupInput size={size} type={visible ? "text" : "password"} {...props} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size={size === "sm" ? "icon-xs" : "icon-sm"}
          aria-label={visible ? strings.auth.hidePassword : strings.auth.showPassword}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
