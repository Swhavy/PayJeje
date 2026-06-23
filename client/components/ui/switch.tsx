import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, onCheckedChange, checked, defaultChecked, ...props }, ref) => {
  const isControlled = checked !== undefined;

  const [internalChecked, setInternalChecked] = React.useState(
    defaultChecked ?? false,
  );

  const isChecked = isControlled ? checked : internalChecked;

  const handleCheckedChange = (val: boolean) => {
    if (!isControlled) setInternalChecked(val);
    onCheckedChange?.(val);
  };

  return (
    <SwitchPrimitives.Root
      className={cn(
        "peer inline-flex h-6 w-16 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-input",
        className,
      )}
      checked={isChecked}
      onCheckedChange={handleCheckedChange}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ease-linear duration-200",
        )}
        style={{
          transform: isChecked ? "translateX(40px)" : "translateX(0px)",
        }}
      />
    </SwitchPrimitives.Root>
  );
});

Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };