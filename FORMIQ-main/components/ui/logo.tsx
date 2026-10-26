import React from "react";
import Link from "next/link";

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon" | "wordmark";
  theme?: "dark" | "light" | "paper" | "auto";
  className?: string;
  href?: string;
}

export function FormIQMark({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 group-hover:scale-105 ${className}`}
      aria-hidden="true"
    >
      {/* Background soft ambient grid glow */}
      <rect width="32" height="32" rx="7" fill="currentColor" fillOpacity="0.06" />
      
      {/* Main Structural 'F' Spine in signature FormIQ Electric Blue */}
      <path
        d="M6 7C6 5.89543 6.89543 5 8 5H24C25.1046 5 26 5.89543 26 7V10C26 10.5523 25.5523 11 25 11H12V14H21C21.5523 14 22 14.4477 22 15V18C22 18.5523 21.5523 19 21 19H12V25C12 26.1046 11.1046 27 10 27H8C6.89543 27 6 26.1046 6 25V7Z"
        fill="#315CFF"
      />
      
      {/* Intelligence Spark Node (Diamond/Quantum Point for 'IQ') */}
      <path
        d="M23 21.5L26.5 25L23 28.5L19.5 25L23 21.5Z"
        fill="currentColor"
        className="opacity-90"
      />
      <circle cx="23" cy="25" r="1.5" fill="#315CFF" />
    </svg>
  );
}

export default function Logo({
  size = "md",
  variant = "full",
  theme = "auto",
  className = "",
  href,
}: LogoProps) {
  const sizeMap = {
    xs: { mark: 18, text: "text-xs tracking-tight", gap: "gap-1.5" },
    sm: { mark: 22, text: "text-sm tracking-tight", gap: "gap-2" },
    md: { mark: 26, text: "text-base tracking-tight", gap: "gap-2.5" },
    lg: { mark: 32, text: "text-xl tracking-tight", gap: "gap-3" },
    xl: { mark: 40, text: "text-2xl tracking-tight", gap: "gap-3.5" },
  };

  const { mark, text, gap } = sizeMap[size];

  // Theme text coloring
  const textThemeClass =
    theme === "dark"
      ? "text-[#F4F2EC]"
      : theme === "light"
      ? "text-[#090A0A]"
      : theme === "paper"
      ? "text-[#090A0A]"
      : "text-current";

  const content = (
    <div
      className={`inline-flex items-center ${gap} font-sans font-extrabold select-none group ${textThemeClass} ${className}`}
    >
      {(variant === "full" || variant === "icon") && (
        <FormIQMark size={mark} />
      )}

      {(variant === "full" || variant === "wordmark") && (
        <span className={`font-black uppercase flex items-center font-sans ${text}`}>
          <span className="tracking-tight">FORM</span>
          <span className="text-[#315CFF] tracking-tight ml-0.5">IQ</span>
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
