import React from 'react';

export type NasaDotState = 0 | 1 | 2;

interface NasaDotProps {
  state: NasaDotState;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export const NasaDot: React.FC<NasaDotProps> = ({
  state,
  size = 28,
  className = '',
  ariaLabel
}) => {
  if (state === 2) {
    // State 2: At least one measurement recorded (NASA Deep Blue #0B3D91 with white stars/orbit and red chevron #FC3D21)
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        className={`shrink-0 ${className}`}
        aria-label={ariaLabel}
        role="img"
      >
        <circle cx="16" cy="16" r="15" fill="#0B3D91" />
        {/* Orbit ellipse */}
        <ellipse
          cx="16"
          cy="16"
          rx="13"
          ry="5.5"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          transform="rotate(-25 16 16)"
          opacity="0.9"
        />
        {/* Red vector / chevron */}
        <path
          d="M7 21 L16 10 L25 21 L22 22 L16 14 L10 22 Z"
          fill="#FC3D21"
        />
        {/* Tiny white stars */}
        <circle cx="10" cy="11" r="0.9" fill="#FFFFFF" />
        <circle cx="21" cy="9" r="0.7" fill="#FFFFFF" />
        <circle cx="23" cy="18" r="0.8" fill="#FFFFFF" />
        <circle cx="12" cy="22" r="0.6" fill="#FFFFFF" />
      </svg>
    );
  }

  if (state === 1) {
    // State 1: App visit without a measurement (Slate grey #C9D1D9 with white details)
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        className={`shrink-0 ${className}`}
        aria-label={ariaLabel}
        role="img"
      >
        <circle cx="16" cy="16" r="15" fill="#C9D1D9" />
        {/* Subtle white orbit */}
        <ellipse
          cx="16"
          cy="16"
          rx="12"
          ry="5"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          transform="rotate(-25 16 16)"
          opacity="0.85"
        />
        {/* Subtle white chevron */}
        <path
          d="M8 20 L16 11 L24 20 L22 21 L16 14 L10 21 Z"
          fill="#FFFFFF"
          opacity="0.9"
        />
      </svg>
    );
  }

  // State 0: No app visit (White with subtle grey outline #AEB9C5)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={`shrink-0 ${className}`}
      aria-label={ariaLabel}
      role="img"
    >
      <circle cx="16" cy="16" r="14.5" fill="#FFFFFF" stroke="#AEB9C5" strokeWidth="1.2" />
      <ellipse
        cx="16"
        cy="16"
        rx="10"
        ry="4"
        fill="none"
        stroke="#D0D7DE"
        strokeWidth="1"
        transform="rotate(-25 16 16)"
        strokeDasharray="2 2"
      />
    </svg>
  );
};
