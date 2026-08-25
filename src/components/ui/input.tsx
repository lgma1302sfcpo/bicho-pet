import { CircleHelp } from "lucide-react";
import { forwardRef, type InputEvent, type InputHTMLAttributes } from "react";

import { applyInputMask, cn, type InputMask } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  help?: string;
  mask?: InputMask;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, help, mask, id, onInput, ...props }, ref) => {
    const inputId = id ?? props.name;

    function handleInput(event: InputEvent<HTMLInputElement>) {
      if (mask) event.currentTarget.value = applyInputMask(event.currentTarget.value, mask);
      onInput?.(event);
    }

    return (
      <label className="block text-sm">
        {label ? <span className="mb-1 flex items-center gap-1 font-medium text-ink">{label}{help ? <span className="group relative inline-flex cursor-help" tabIndex={0} aria-label={help}><CircleHelp size={15} className="text-brand-600" /><span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-64 -translate-x-1/2 rounded-md bg-slate-900 px-3 py-2 text-xs font-normal leading-relaxed text-white shadow-lg group-hover:block group-focus:block">{help}</span></span> : null}</span> : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-10 w-full rounded-md border bg-white px-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100",
            error ? "border-danger" : "border-border",
            className
          )}
          inputMode={mask === "currency" || mask === "decimal" ? "decimal" : mask === "integer" || mask === "phone" || mask === "document" ? "numeric" : props.inputMode}
          onInput={handleInput}
          {...props}
        />
        {error ? <span className="mt-1 block text-xs font-medium text-danger">{error}</span> : null}
      </label>
    );
  }
);

Input.displayName = "Input";
