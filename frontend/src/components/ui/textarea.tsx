import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, value, ...props }, ref) => {

    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    React.useImperativeHandle(ref, () => textareaRef.current!);

    const adjustHeight = (textarea: HTMLTextAreaElement) => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    React.useEffect(() => {
      if (textareaRef.current) {
        adjustHeight(textareaRef.current);
      }
    }, [value]);

    return (
      <textarea
        ref={textareaRef}
        className={cn(
          "flex w-full rounded-md border border-input bg-white px-3 py-2 text-base placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none overflow-hidden",
          className
        )}
        value={value}
        onInput={(e) => adjustHeight(e.currentTarget)}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };
