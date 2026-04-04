import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const base = "inline-flex items-center justify-center font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed gap-2";

  const variants = {
    primary:   "bg-emerald-600 text-white hover:bg-emerald-700",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    danger:    "bg-red-600 text-white hover:bg-red-700",
    ghost:     "text-slate-600 hover:bg-slate-100",
    outline:   "border border-slate-300 text-slate-700 hover:bg-slate-50",
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-4 py-2",
    lg: "text-sm px-5 py-2.5",
  };

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}
