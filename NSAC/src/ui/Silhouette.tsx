import React from 'react';
import type { Status } from '../types';

export type BodyZoneKey = 'heart' | 'bone' | 'belly' | 'skin' | 'radiation';

interface SilhouetteProps {
  selectedZone: BodyZoneKey;
  onSelectZone: (zone: BodyZoneKey) => void;
  zoneStatuses: Record<BodyZoneKey, Status>;
}

export const Silhouette: React.FC<SilhouetteProps> = ({
  selectedZone,
  onSelectZone,
  zoneStatuses
}) => {
  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'contact_flight_surgeon':
        return '#C93C3C';
      case 'action':
        return '#E07B00';
      case 'watch':
        return '#D9A400';
      case 'normal':
      default:
        return '#2E9E6B';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, zone: BodyZoneKey) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectZone(zone);
    }
  };

  return (
    <div className="relative w-full max-w-[340px] aspect-[340/520] mx-auto select-none">
      <svg
        className="w-full h-full drop-shadow-xs"
        fill="none"
        viewBox="0 0 340 520"
        xmlns="http://www.w3.org/2000/svg"
        role="group"
        aria-label="Silhouette anatomique interactive"
      >
        <defs>
          <linearGradient id="bodyGrad" x1="170" y1="20" x2="170" y2="500" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#DDE7F5" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#EBF2FA" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#CFD8E5" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* Anatomical Head */}
        <path
          d="M170 30 C154 30 144 42 144 60 C144 76 152 90 162 94 L162 108 L178 108 L178 94 C188 90 196 76 196 60 C196 42 186 30 170 30 Z"
          fill="url(#bodyGrad)"
          stroke="#B5C9E2"
          strokeWidth="1.2"
        />

        {/* Torso & Arms */}
        <path
          d="M162 108 C135 112 108 126 96 142 C85 158 76 195 72 235 C69 265 67 305 65 330 C64 340 73 344 78 335 C86 320 95 275 100 240 C106 200 115 178 128 174 L132 270 C132 295 135 320 142 345 L152 355 L164 355 L170 260 L176 355 L188 355 L198 345 C205 320 208 295 208 270 L212 174 C225 178 234 200 240 240 C245 275 254 320 262 335 C267 344 276 340 275 330 C273 305 271 265 268 235 C264 195 255 158 244 142 C232 126 205 112 178 108 Z"
          fill="url(#bodyGrad)"
          stroke="#B5C9E2"
          strokeWidth="1.2"
        />

        {/* Pelvis & Legs */}
        <path
          d="M142 345 L136 415 C132 445 130 475 127 500 C125 507 135 510 141 506 C147 502 153 480 156 450 L164 370 L170 370 L176 370 L184 450 C187 480 193 502 199 506 C205 510 215 507 213 500 C210 475 208 445 204 415 L198 345 Z"
          fill="url(#bodyGrad)"
          stroke="#B5C9E2"
          strokeWidth="1.2"
        />

        {/* Subtle Anatomical Axis */}
        <path d="M170 110 L170 280" opacity="0.3" stroke="#0B4F8A" strokeDasharray="3 3" strokeWidth="1" />

        {/* ZONE 1: COEUR (Heart & Cardiovascular) */}
        <g
          className="cursor-pointer group focus:outline-none"
          onClick={() => onSelectZone('heart')}
          onKeyDown={(e) => handleKeyDown(e, 'heart')}
          role="button"
          tabIndex={0}
          aria-label={`Zone Cœur et Cardiovasculaire, statut : ${zoneStatuses.heart}`}
        >
          {/* Transparent 52px hit area */}
          <circle cx="160" cy="172" r="26" fill="transparent" pointerEvents="all" />

          {selectedZone === 'heart' && (
            <circle
              cx="160"
              cy="172"
              r="24"
              fill={getStatusColor(zoneStatuses.heart)}
              fillOpacity="0.18"
              className="motion-safe:animate-ping"
              style={{ transformOrigin: '160px 172px' }}
            />
          )}
          <circle
            cx="160"
            cy="172"
            r={selectedZone === 'heart' ? 19 : 14}
            fill={getStatusColor(zoneStatuses.heart)}
            fillOpacity="0.25"
            stroke={getStatusColor(zoneStatuses.heart)}
            strokeWidth={selectedZone === 'heart' ? 3 : 2}
          />
          <circle cx="160" cy="172" r="6" fill={getStatusColor(zoneStatuses.heart)} />
        </g>

        {/* ZONE 2: OS ET MUSCLES (Spine & Femurs) */}
        <g
          className="cursor-pointer group focus:outline-none"
          onClick={() => onSelectZone('bone')}
          onKeyDown={(e) => handleKeyDown(e, 'bone')}
          role="button"
          tabIndex={0}
          aria-label={`Zone Os et Muscles, statut : ${zoneStatuses.bone}`}
        >
          {/* Transparent hit area covering spine & upper legs */}
          <rect x="135" y="190" width="70" height="250" fill="transparent" pointerEvents="all" />

          {/* Spine indicator */}
          <rect
            x="167"
            y="195"
            width="6"
            height="42"
            rx="3"
            fill={getStatusColor(zoneStatuses.bone)}
            fillOpacity="0.4"
            stroke={getStatusColor(zoneStatuses.bone)}
            strokeWidth={selectedZone === 'bone' ? 2.5 : 1.5}
          />

          {/* Left Femur */}
          <line
            x1="146"
            y1="380"
            x2="139"
            y2="435"
            stroke={getStatusColor(zoneStatuses.bone)}
            strokeWidth={selectedZone === 'bone' ? 6 : 4}
            strokeLinecap="round"
            strokeOpacity="0.7"
          />
          {/* Right Femur */}
          <line
            x1="194"
            y1="380"
            x2="201"
            y2="435"
            stroke={getStatusColor(zoneStatuses.bone)}
            strokeWidth={selectedZone === 'bone' ? 6 : 4}
            strokeLinecap="round"
            strokeOpacity="0.7"
          />

          <circle cx="143" cy="405" r="5" fill={getStatusColor(zoneStatuses.bone)} />
          <circle cx="197" cy="405" r="5" fill={getStatusColor(zoneStatuses.bone)} />
        </g>

        {/* ZONE 3: VENTRE (Glycémie & Métabolisme) */}
        <g
          className="cursor-pointer group focus:outline-none"
          onClick={() => onSelectZone('belly')}
          onKeyDown={(e) => handleKeyDown(e, 'belly')}
          role="button"
          tabIndex={0}
          aria-label={`Zone Ventre et Métabolisme glycémique, statut : ${zoneStatuses.belly}`}
        >
          {/* Transparent 52px hit area */}
          <circle cx="170" cy="245" r="26" fill="transparent" pointerEvents="all" />

          {selectedZone === 'belly' && (
            <ellipse
              cx="170"
              cy="245"
              rx="24"
              ry="18"
              fill={getStatusColor(zoneStatuses.belly)}
              fillOpacity="0.18"
              className="motion-safe:animate-ping"
              style={{ transformOrigin: '170px 245px' }}
            />
          )}
          <ellipse
            cx="170"
            cy="245"
            rx={selectedZone === 'belly' ? 19 : 14}
            ry={selectedZone === 'belly' ? 15 : 10}
            fill={getStatusColor(zoneStatuses.belly)}
            fillOpacity="0.25"
            stroke={getStatusColor(zoneStatuses.belly)}
            strokeWidth={selectedZone === 'belly' ? 2.5 : 1.5}
          />
          <circle cx="170" cy="245" r="5" fill={getStatusColor(zoneStatuses.belly)} />
        </g>

        {/* ZONE 4: PEAU (Température) */}
        <g
          className="cursor-pointer group focus:outline-none"
          onClick={() => onSelectZone('skin')}
          onKeyDown={(e) => handleKeyDown(e, 'skin')}
          role="button"
          tabIndex={0}
          aria-label={`Zone Peau et Thermorégulation, statut : ${zoneStatuses.skin}`}
        >
          {/* Transparent 52px hit area */}
          <circle cx="258" cy="275" r="26" fill="transparent" pointerEvents="all" />

          {selectedZone === 'skin' && (
            <circle
              cx="258"
              cy="275"
              r="22"
              fill={getStatusColor(zoneStatuses.skin)}
              fillOpacity="0.18"
              className="motion-safe:animate-ping"
              style={{ transformOrigin: '258px 275px' }}
            />
          )}
          <circle
            cx="258"
            cy="275"
            r={selectedZone === 'skin' ? 15 : 11}
            fill={getStatusColor(zoneStatuses.skin)}
            fillOpacity="0.25"
            stroke={getStatusColor(zoneStatuses.skin)}
            strokeWidth={selectedZone === 'skin' ? 2.5 : 1.5}
          />
          <circle cx="258" cy="275" r="4.5" fill={getStatusColor(zoneStatuses.skin)} />
        </g>

        {/* ZONE 5: EXPOSITION (Radiations) */}
        <g
          className="cursor-pointer group focus:outline-none"
          onClick={() => onSelectZone('radiation')}
          onKeyDown={(e) => handleKeyDown(e, 'radiation')}
          role="button"
          tabIndex={0}
          aria-label={`Zone Exposition aux Radiations, statut : ${zoneStatuses.radiation}`}
        >
          {/* Transparent 52px hit area */}
          <rect x="110" y="125" width="40" height="42" fill="transparent" pointerEvents="all" />

          <rect
            x="122"
            y="135"
            width={selectedZone === 'radiation' ? 18 : 14}
            height={selectedZone === 'radiation' ? 22 : 18}
            rx="4"
            fill={getStatusColor(zoneStatuses.radiation)}
            fillOpacity="0.3"
            stroke={getStatusColor(zoneStatuses.radiation)}
            strokeWidth={selectedZone === 'radiation' ? 2.5 : 1.5}
          />
          <circle cx="129" cy="144" r="3.5" fill={getStatusColor(zoneStatuses.radiation)} />
        </g>
      </svg>
    </div>
  );
};
