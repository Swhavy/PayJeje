"use client"
import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

const Progress = React.forwardRef(({ className, value, ...props }, ref) => (
  <div className="relative w-full h-2">
    {/* Animated gradient border */}
    <div className="absolute -inset-[2px] rounded-full overflow-hidden">
      <div 
        className="absolute inset-0 animate-border-spin opacity-20" 
        style={{
          background: 'conic-gradient(from 0deg, transparent 0%, #10b981 25%, #a855f7 50%, #3b82f6 75%, transparent 100%)'
        }}
      />
    </div>
    
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-[#1a1f2e] z-10",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all shadow-lg shadow-emerald-500/50"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  </div>
))

Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }