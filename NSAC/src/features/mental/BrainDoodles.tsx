import React from 'react';
import { DecorativeDoodleLayer, type DecorativeDoodle } from '../../ui/decorative/DecorativeDoodleLayer';
import { DECORATIVE_DOODLE_CONFIG } from '../../ui/decorative/decorationConfig';

type BrainVariant = 'profile' | 'constellation' | 'top' | 'orbit' | 'network';

export function BrainSvg({ variant }: { variant: BrainVariant }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.35, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, vectorEffect: 'non-scaling-stroke' as const };
  const outline = <path {...common} d="M80 20c-8-11-25-12-34-3-14-5-28 5-28 20-12 7-13 24-3 33-5 15 4 30 19 32 7 13 23 14 33 5 9 8 27 7 34-5 15-2 22-18 15-31 9-12 4-28-8-34-1-14-14-22-28-17Z" />;
  const folds = <g {...common}>
    <path d="M49 20c-6 8-7 16-1 22 5 5 4 11-2 15-6 4-6 11-1 16 4 5 3 11-2 15" />
    <path d="M77 20c-5 7-4 13 2 17 7 5 6 11 0 15-6 4-6 10 0 14 6 4 6 10 1 15" />
    <path d="M30 39c7-4 13-3 17 2m-28 13c8-3 14 0 18 6m-2 25c5-6 12-7 18-3m27-62c8 2 12 7 12 14m3 27c8 0 13 4 15 10m-25 20c7-6 14-7 20-3" />
  </g>;
  let drawing: React.ReactNode;
  if (variant === 'profile') drawing = <>{outline}{folds}</>;
  else if (variant === 'constellation') drawing = <>
    {outline}
    <g {...common} opacity=".58"><path d="m30 35 18 7 13-15 20 8 13 16-19 11 12 20-18 8-17-12-23 5-3-22 21-13Z" /></g>
    <g fill="#E8B93C" stroke="none"><circle cx="30" cy="35" r="2.3"/><circle cx="61" cy="27" r="2"/><circle cx="81" cy="35" r="2.5"/><circle cx="94" cy="51" r="2"/><circle cx="75" cy="62" r="2.2"/><circle cx="87" cy="82" r="2.4"/><circle cx="69" cy="90" r="1.8"/><circle cx="52" cy="78" r="2"/><circle cx="29" cy="83" r="2.2"/></g>
  </>;
  else if (variant === 'top') drawing = <g {...common}>
    <path d="M80 20c-8-11-25-12-34-3-14-5-28 5-28 20-12 7-13 24-3 33-5 15 4 30 19 32 7 13 23 14 33 5 4-3 8-3 12 0 10 9 26 8 33-5 15-2 22-18 15-31 9-12 4-28-8-34-1-14-14-22-28-17Z" />
    <path d="M80 20v87M47 25c-7 8-5 15 1 20m-21 8c9-2 14 2 16 9m-6 24c6-5 13-5 19-1m38-61c6 7 5 14 0 19m17 9c-8-2-14 2-17 9m6 24c-6-5-13-5-19-1" />
  </g>;
  else if (variant === 'orbit') drawing = <>
    <ellipse {...common} cx="64" cy="61" rx="56" ry="30" transform="rotate(-16 64 61)" opacity=".72" />
    {outline}{folds}
    <circle cx="113" cy="44" r="3.2" fill="#E8B93C" />
  </>;
  else drawing = <g {...common}>
    <path d="m10 52 22 8 18-22 21 15 20-25 22 13 28-12M8 89l23-15 19 22 22-18 21 15 24-23 21 10" opacity=".8" />
    <path d="m32 60 0 14m18-36 0 57m21-42v24m20-49v67m22-54 0 38m28-51v61" opacity=".54" />
    <g fill="#E8B93C" stroke="none"><circle cx="10" cy="52" r="2.7"/><circle cx="50" cy="38" r="2.2"/><circle cx="92" cy="31" r="2.5"/><circle cx="141" cy="29" r="2.2"/><circle cx="31" cy="74" r="2"/><circle cx="72" cy="91" r="2.6"/><circle cx="116" cy="68" r="2.2"/><circle cx="141" cy="83" r="2.4"/></g>
  </g>;
  return <svg aria-hidden="true" viewBox="0 0 160 120" preserveAspectRatio="xMidYMid meet" focusable="false">{drawing}</svg>;
}

const BRAIN_VARIANTS = ['profile', 'constellation', 'top', 'orbit', 'network'] as const;
const brainItems: DecorativeDoodle[] = BRAIN_VARIANTS.map((variant) => ({ id: `brain-${variant}`, render: <BrainSvg variant={variant} /> }));

export const BrainDoodles: React.FC = () => <DecorativeDoodleLayer
  items={brainItems}
  config={DECORATIVE_DOODLE_CONFIG.mental}
  strategy="rails"
/>;
