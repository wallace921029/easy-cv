import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { strings } from "@/lib/strings";
import { Button } from "@/components/ui/button";

export function NewClipButton({ onClick }: { onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Button
      size={isHovered ? "default" : "icon"}
      aria-label={strings.clips.new}
      onClick={onClick}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setIsHovered(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setIsHovered(false);
      }}
      className="shrink-0 overflow-hidden transition-[width,padding,gap] duration-300 ease-out select-none"
    >
      <PlusIcon className="size-4 shrink-0" />
      <AnimatePresence initial={false}>
        {isHovered && (
          <motion.span
            key="label"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{
              width: { type: "spring", stiffness: 450, damping: 32 },
              opacity: { duration: 0.18 },
            }}
            className="overflow-hidden whitespace-nowrap text-sm font-medium"
          >
            {strings.clips.new}
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}
