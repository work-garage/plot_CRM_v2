import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    const variantStyles = {
      default:
        "bg-primary text-primary-foreground shadow-[0_12px_24px_-16px_hsl(var(--primary)/0.75)] hover:bg-primary/92 focus-visible:ring-primary",
      destructive:
        "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 focus-visible:ring-destructive",
      outline:
        "border border-border/80 bg-white/80 text-foreground shadow-sm hover:bg-white focus-visible:ring-ring",
      secondary:
        "bg-secondary text-secondary-foreground hover:bg-secondary/90 focus-visible:ring-ring",
      ghost: "text-foreground hover:bg-muted/70 hover:text-foreground",
      link: "text-primary underline-offset-4 hover:underline",
    }

    const sizeStyles = {
      default: "h-9 sm:h-10 px-3 sm:px-4 py-1.5 sm:py-2",
      sm: "h-8 sm:h-9 rounded-md px-2.5 sm:px-3",
      lg: "h-10 sm:h-11 rounded-lg px-6 sm:px-8",
      icon: "h-9 w-9 sm:h-10 sm:w-10 rounded-lg",
    }

    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-xs sm:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
