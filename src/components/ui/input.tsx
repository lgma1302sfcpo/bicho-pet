"use client";

import { CircleHelp, Eye, EyeOff } from "lucide-react";
import React, { forwardRef, type InputEvent, type InputHTMLAttributes, useState } from "react";

import { applyInputMask, cn, type InputMask } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  help?: string;
  mask?: InputMask;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, help, mask, id, onInput, type, ...props }, ref) => {
    const inputId = id ?? props.name;
    const isPassword = type === "password";
    const [passwordVisible, setPasswordVisible] = useState(false);

    function handleInput(event: InputEvent<HTMLInputElement>) {
      if (mask) event.currentTarget.value = applyInputMask(event.currentTarget.value, mask);
      onInput?.(event);
    }

    return (
      <div className="ui-field block min-w-0 text-sm">
        {label ? <span className="ui-field__label mb-1 flex items-center gap-1 font-medium text-ink"><label htmlFor={inputId}>{label}</label>{help ? <span className="group relative inline-flex shrink-0 cursor-help" tabIndex={0} aria-label={help}><CircleHelp size={15} className="text-brand-600" /><span role="tooltip" className="ui-help-tooltip pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-64 -translate-x-1/2 rounded-md bg-slate-900 px-3 py-2 text-xs font-normal leading-relaxed text-white shadow-lg group-hover:block group-focus:block">{help}</span></span> : null}</span> : null}
        <span className="ui-field__control relative block">
          <input
            ref={ref}
            id={inputId}
            type={isPassword && passwordVisible ? "text" : type}
            className={cn(
              "ui-control h-10 w-full rounded-md border bg-white px-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100",
              isPassword ? "pr-11" : null,
              error ? "border-danger" : "border-border",
              className
            )}
            inputMode={mask === "currency" || mask === "decimal" ? "decimal" : mask === "integer" || mask === "phone" || mask === "document" ? "numeric" : props.inputMode}
            onInput={handleInput}
            {...props}
          />
          {isPassword ? (
            <button
              type="button"
              className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-subdued transition hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              aria-label={passwordVisible ? "Ocultar senha" : "Visualizar senha"}
              aria-pressed={passwordVisible}
              onClick={() => setPasswordVisible((visible) => !visible)}
            >
              {passwordVisible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          ) : null}
        </span>
        {error ? <span className="ui-field__error mt-1 block text-xs font-medium text-danger">{error}</span> : null}
      </div>
    );
  }
);

Input.displayName = "Input";
