import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 border-brand-600",
  secondary: "bg-white text-ink hover:bg-muted border-border",
  ghost: "bg-transparent text-subdued hover:bg-muted border-transparent",
  danger: "bg-danger text-white hover:bg-red-700 border-danger"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className
      )}
      {...props}
    />
  )
);

Button.displayName = "Button";
