import { useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { strings } from "@/lib/strings";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

export function SearchBox({
  value,
  onChange,
  size = "default",
}: {
  value: string;
  onChange: (value: string) => void;
  size?: "default" | "sm" | "lg";
}) {
  const [focused, setFocused] = useState(false);
  return (
    <InputGroup size={size}>
      <InputGroupAddon>
        <SearchIcon className="size-4" />
      </InputGroupAddon>
      <InputGroupInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            onChange("");
            e.currentTarget.blur();
          }
        }}
        placeholder={strings.clips.searchPlaceholder}
        aria-label={strings.clips.searchPlaceholder}
        data-focused={focused || undefined}
      />
      {value ? (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-sm"
            aria-label={strings.clips.clearSearch}
            onClick={() => onChange("")}
          >
            <XIcon className="size-4" />
          </InputGroupButton>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
}
