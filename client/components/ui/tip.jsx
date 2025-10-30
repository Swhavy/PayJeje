// components/ui/Tooltip.jsx
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

const Tooltip = ({
  children,
  content,
  title,
  side = "top",
  sideOffset = 5,
  delayDuration = 200,
  className = "",
}) => {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {/* Wrap children in a span if it's not already a component */}
          <span className="inline-block cursor-help">{children}</span>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={sideOffset}
            className={`
              bg-slate-900 text-white px-3 py-2 rounded-lg text-sm shadow-xl
              animate-in fade-in-0 zoom-in-95
              data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95
              max-w-xs z-50
              ${className}
            `}
          >
            {title && <div className="font-semibold mb-1">{title}</div>}
            <div className="text-sm text-slate-300">{content}</div>
            <TooltipPrimitive.Arrow className="fill-slate-900" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};

export default Tooltip;
