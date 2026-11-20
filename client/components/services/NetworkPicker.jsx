import React from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Nigerian mobile carrier 4-digit (and 5-digit Visafone) prefix map.
 */
const NETWORK_PREFIXES = {
  MTN: [
    "0703",
    "0704",
    "0706",
    "0803",
    "0806",
    "0810",
    "0813",
    "0814",
    "0816",
    "0903",
    "0906",
    "0913",
    "0916",
    "07025",
    "07026",
  ],
  GLO: ["0705", "0805", "0807", "0811", "0815", "0905", "0915"],
  AIRTEL: [
    "0701",
    "0708",
    "0802",
    "0808",
    "0812",
    "0901",
    "0902",
    "0904",
    "0907",
    "0911",
    "0912",
  ],
  "9MOBILE": ["0809", "0817", "0818", "0908", "0909"],
};

/**
 * Normalizes Nigerian phone numbers (+234 / 234 -> 0) and detects network from first 4-5 digits.
 * Returns "MTN" | "GLO" | "AIRTEL" | "9MOBILE" | null.
 */
export function detectNetworkFromPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;

  let local = digits;
  if (local.startsWith("234") && local.length >= 7) {
    local = "0" + local.slice(3);
  }
  if (local.length < 4) return null;

  const prefix5 = local.slice(0, 5);
  const prefix4 = local.slice(0, 4);

  for (const [network, prefixes] of Object.entries(NETWORK_PREFIXES)) {
    if (prefixes.includes(prefix5) || prefixes.includes(prefix4)) {
      return network;
    }
  }
  return null;
}

function MtnLogo() {
  return (
    <svg viewBox="0 0 36 22" className="h-5 w-7 shrink-0" aria-hidden="true">
      <rect width="36" height="22" rx="11" fill="#FFCC00" />
      <ellipse cx="18" cy="11" rx="14" ry="7.5" fill="none" stroke="#111827" strokeWidth="1.4" />
      <text
        x="18"
        y="14"
        textAnchor="middle"
        fontSize="8.5"
        fontWeight="900"
        fontFamily="Inter, sans-serif"
        fill="#111827"
      >
        MTN
      </text>
    </svg>
  );
}

function GloLogo() {
  return (
    <svg viewBox="0 0 28 28" className="h-5 w-5 shrink-0" aria-hidden="true">
      <circle cx="14" cy="14" r="13" fill="#00A651" />
      <text
        x="14"
        y="17"
        textAnchor="middle"
        fontSize="10"
        fontWeight="900"
        fontFamily="Inter, sans-serif"
        fill="#FFFFFF"
      >
        glo
      </text>
    </svg>
  );
}

function AirtelLogo() {
  return (
    <svg viewBox="0 0 28 28" className="h-5 w-5 shrink-0" aria-hidden="true">
      <circle cx="14" cy="14" r="13" fill="#E40000" />
      <path
        d="M15.8 7.5c-3.5 0-6.8 2.6-6.8 6.4 0 2.7 1.8 4.4 4.1 4.4 1.9 0 3.3-.9 4.2-2.2.2 1.2 1 1.9 2.1 1.9 1.6 0 2.6-1.4 2.6-3.7 0-3.9-2.8-6.8-6.2-6.8zm-1.1 7.6c-1.1 0-1.9-.8-1.9-2 0-1.6 1.3-2.9 2.9-2.9 1.3 0 2.2.9 2.2 2.2 0 1.5-1.5 2.7-3.2 2.7z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

function NineMobileLogo() {
  return (
    <svg viewBox="0 0 28 28" className="h-5 w-5 shrink-0" aria-hidden="true">
      <circle cx="14" cy="14" r="13" fill="#006E46" />
      <text
        x="14"
        y="18"
        textAnchor="middle"
        fontSize="12"
        fontWeight="900"
        fontFamily="Inter, sans-serif"
        fill="#B4E33D"
      >
        9
      </text>
    </svg>
  );
}

export const NETWORK_OPTIONS = [
  { id: "MTN", name: "MTN", Logo: MtnLogo },
  { id: "GLO", name: "GLO", Logo: GloLogo },
  { id: "AIRTEL", name: "AIRTEL", Logo: AirtelLogo },
  { id: "9MOBILE", name: "9MOBILE", Logo: NineMobileLogo },
];

/**
 * Shared compact 4-chip network selector used identically on Data & Airtime.
 */
export function NetworkPicker({
  value,
  onChange,
  sublabelFn,
  className = "",
}) {
  const normalizedValue = value ? String(value).toUpperCase() : "";

  return (
    <div
      role="radiogroup"
      aria-label="Select network provider"
      className={cn("grid grid-cols-4 gap-2", className)}
    >
      {NETWORK_OPTIONS.map((net) => {
        const isSelected = normalizedValue === net.id;
        const sublabel = sublabelFn ? sublabelFn(net.id) : null;
        const Logo = net.Logo;

        return (
          <button
            key={net.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange?.(net)}
            className={cn(
              "pw-pressable relative min-h-[52px] rounded-panel border px-1 py-1.5 flex flex-col items-center justify-center gap-1 transition-all",
              sublabel && "min-h-[60px]",
              isSelected
                ? "border-brand-400 bg-brand-tint ring-1 ring-brand-400/35 text-foreground shadow-[0_10px_24px_-12px_hsl(var(--brand-400)/0.55)]"
                : "pw-panel hover:border-brand-400/35 text-muted-foreground hover:text-foreground",
            )}
          >
            {isSelected && (
              <CheckCircle2
                className="h-3.5 w-3.5 text-brand-400 absolute top-1 right-1"
                aria-hidden="true"
              />
            )}
            <Logo />
            <span className="text-[11px] font-bold tracking-tight leading-none whitespace-nowrap">
              {net.name}
            </span>
            {sublabel && (
              <span className="text-[9px] font-semibold text-brand-400 leading-none whitespace-nowrap max-w-full">
                {sublabel}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default NetworkPicker;
