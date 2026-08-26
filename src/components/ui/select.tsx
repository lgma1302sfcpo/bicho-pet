import { CircleHelp } from "lucide-react";
import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  help?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, help, id, children, ...props }, ref) => {
    const selectId = id ?? props.name;

    return (
      <label className="ui-field block min-w-0 text-sm">
        {label ? <span className="ui-field__label mb-1 flex items-center gap-1 font-medium text-ink">{label}{help ? <span className="group relative inline-flex shrink-0 cursor-help" tabIndex={0} aria-label={help}><CircleHelp size={15} className="text-brand-600" /><span role="tooltip" className="ui-help-tooltip pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-64 -translate-x-1/2 rounded-md bg-slate-900 px-3 py-2 text-xs font-normal leading-relaxed text-white shadow-lg group-hover:block group-focus:block">{help}</span></span> : null}</span> : null}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "ui-control ui-select h-10 w-full rounded-md border bg-white px-3 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100",
            error ? "border-danger" : "border-border",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error ? <span className="ui-field__error mt-1 block text-xs font-medium text-danger">{error}</span> : null}
      </label>
    );
  }
);

Select.displayName = "Select";
