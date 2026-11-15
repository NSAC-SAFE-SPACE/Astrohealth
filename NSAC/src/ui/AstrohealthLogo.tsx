import React from 'react';

type AstrohealthLogoProps = {
  size?: number;
  className?: string;
};

export const AstrohealthLogo: React.FC<AstrohealthLogoProps> = ({ size = 40, className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 128 128"
    width={size}
    height={size}
    role="img"
    aria-label="Astrohealth"
    className={`block shrink-0 ${className}`}
    focusable="false"
  >
    <title>Astrohealth</title>
    {size < 24 ? (
      <>
        <circle cx="64" cy="64" r="58" fill="#EEF0F3" stroke="#3E444C" strokeWidth="7" />
        <rect x="22" y="38" width="84" height="52" rx="26" fill="#3E444C" />
        <path d="M64 48 Q67 61 80 64 Q67 67 64 80 Q61 67 48 64 Q61 61 64 48 Z" fill="#E8B93C" />
      </>
    ) : (
      <>
        <g transform="rotate(-15 64 80)">
          <path d="M4 80 A60 14 0 0 1 124 80" fill="none" stroke="#0B4F8A" strokeWidth="3" strokeLinecap="round" />
        </g>
        <circle cx="64" cy="64" r="48" fill="#EEF0F3" stroke="#3E444C" strokeWidth="5" />
        <rect x="31" y="42" width="66" height="44" rx="22" fill="#3E444C" />
        <path d="M40 53 Q44 47.5 51 46.5" fill="none" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth="3" strokeLinecap="round" />
        <path d="M36 64 H47 L52 64 L57.5 52 L64 76 L69.5 58 L73 64 H79" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M87 56 Q88.5 62.5 95 64 Q88.5 65.5 87 72 Q85.5 65.5 79 64 Q85.5 62.5 87 56 Z" fill="#E8B93C" />
        <g transform="rotate(-15 64 80)">
          <path d="M4 80 A60 14 0 0 0 124 80" fill="none" stroke="#0B4F8A" strokeWidth="3" strokeLinecap="round" />
          <circle cx="94" cy="92.1" r="4.5" fill="#0B4F8A" stroke="#FFFFFF" strokeWidth="2" />
        </g>
      </>
    )}
  </svg>
);
