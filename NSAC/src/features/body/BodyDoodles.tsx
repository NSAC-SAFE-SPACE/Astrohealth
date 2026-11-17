import React from 'react';
import type { DecorativeDoodle } from '../../ui/decorative/DecorativeDoodleLayer';
import './body-doodles.css';

const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.85, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, vectorEffect: 'non-scaling-stroke' as const };

function EyeDoodle() { return <svg viewBox="0 0 160 120"><g {...line}><ellipse cx="79" cy="60" rx="42" ry="25"/><circle cx="79" cy="60" r="14"/><circle cx="79" cy="60" r="5"/><circle cx="79" cy="60" r="52" strokeOpacity=".55"/><path d="M43 83c11 13 25 20 37 21m37-21c-7 9-15 15-23 18"/></g><circle cx="119" cy="28" r="3" fill="#e8b93c"/></svg>; }
function HeartEcgDoodle() { return <svg viewBox="0 0 160 120"><g {...line}><path d="M80 101 33 59C4 31 42 8 64 34l16 17 16-17c23-25 59-2 31 25Z"/><path className="ecg-path" d="M28 67h28l9-18 13 38 13-51 14 31h29"/></g><circle cx="128" cy="67" r="3" fill="#e8b93c"/></svg>; }
function LungsDoodle() { return <svg viewBox="0 0 160 120"><g {...line}><path d="M79 22v34m0-13-12 16m12-16 13 16"/><path className="lung-left" d="M64 48c-11 4-20 19-25 38-5 19 7 25 21 18 13-6 18-19 19-37V59Z"/><path className="lung-right" d="M96 48c11 4 20 19 25 38 5 19-7 25-21 18-13-6-18-19-19-37V59Z"/></g><g fill="#e8b93c"><circle cx="43" cy="37" r="2.4"/><circle cx="119" cy="34" r="2"/><circle cx="132" cy="49" r="1.8"/></g></svg>; }
function BloodPressureDoodle() { return <svg viewBox="0 0 160 120"><g {...line}><rect x="26" y="42" width="34" height="38" rx="8"/><path d="M60 61h13m0 0a31 31 0 1 1 0 1m31-1h19"/><circle cx="104" cy="61" r="22"/><path className="bp-needle" d="m104 61 12-12"/><path d="M93 39v-7m22 7 4-6m7 18 7-2m-2 25 6 3"/></g><circle cx="104" cy="61" r="3" fill="#e8b93c"/></svg>; }
function GlucoseDoodle() { return <svg viewBox="0 0 160 120"><g {...line}><path d="M49 30C39 48 25 64 25 79a24 24 0 0 0 48 0c0-15-14-31-24-49Z"/><path d="m112 35 19 11v22l-19 11-19-11V46Z"/><path d="m93 57-12 7m50-7 10-6m-29 27v14"/></g><circle cx="81" cy="64" r="3" fill="#e8b93c"/></svg>; }
function KidneyHydrationDoodle() { return <svg viewBox="0 0 160 120"><g {...line}><path d="M69 27c-25-13-48 8-43 37 4 24 18 42 36 36 13-4 14-17 9-27-4-8-2-16 5-22 8-8 5-19-7-24Z"/><path d="M68 65c12 0 21 5 25 14m-1 0c5-8 14-12 25-12"/><path className="kidney-ripple" d="M114 33c-6 10-14 19-14 28a14 14 0 0 0 28 0c0-9-8-18-14-28Z"/><path d="M108 64c3 4 7 4 10 0"/></g><circle cx="47" cy="49" r="2.5" fill="#e8b93c"/></svg>; }
function SpineBoneDoodle() { return <svg viewBox="0 0 160 120"><g {...line}><path d="M77 18c-7 9 7 14 0 23s7 14 0 23 7 14 0 23 7 14 0 22"/>{[25,42,59,76,93,108].map((y) => <rect key={y} x="65" y={y - 5} width="24" height="10" rx="5"/>)}<path d="M54 28h11m24 0h13m-48 34h11m24 0h14m-49 34h11m24 0h13"/></g><g fill="#e8b93c"><circle cx="43" cy="35" r="2"/><circle cx="110" cy="53" r="2.2"/><circle cx="46" cy="87" r="1.8"/></g></svg>; }
function MuscleDoodle() { return <svg viewBox="0 0 160 120"><g {...line}><path d="M29 74c14-8 25-24 34-31 8-7 17-5 20 3l5 12c8-7 16-8 20-3l6 8c8-5 16-2 17 6l-1 17c-1 11-12 18-25 18H66c-17 0-28-9-37-30Z"/><path className="muscle-fiber" d="M45 80c14 4 23 2 32-8m-25 18c13 4 22 1 32-7m-12 13c13 2 20-1 28-7"/><path d="M93 59 88 44m24 19 5-12"/></g><circle cx="131" cy="50" r="3" fill="#e8b93c"/></svg>; }
function ThermometerDoodle() { return <svg viewBox="0 0 160 120"><g {...line}><path d="M69 27a14 14 0 0 1 28 0v43a25 25 0 1 1-28 0Z"/><path className="thermometer-mercury" d="M83 43v43"/><path d="M98 43h10m-10 14h7m-7 14h10"/></g><circle cx="83" cy="92" r="9" fill="#e8b93c"/></svg>; }
function AtomDoodle() { return <svg viewBox="0 0 160 120"><g className="atom-orbit" {...line}><ellipse cx="80" cy="60" rx="53" ry="20"/><ellipse cx="80" cy="60" rx="53" ry="20" transform="rotate(60 80 60)"/><ellipse cx="80" cy="60" rx="53" ry="20" transform="rotate(120 80 60)"/></g><circle cx="80" cy="60" r="5" fill="#e8b93c"/><circle cx="132" cy="60" r="3" fill="#e8b93c"/></svg>; }
function CarbonDioxideDoodle() { return <svg viewBox="0 0 160 120"><g {...line}><path d="M47 59h29m28 0h12"/><circle cx="36" cy="59" r="15"/><circle cx="91" cy="59" r="18"/><circle cx="128" cy="59" r="12"/><path className="co2-bubble" d="M43 35c-3-5-6-8-6-12a6 6 0 1 1 12 0c0 4-3 7-6 12Zm73 57c-3-5-6-8-6-12a6 6 0 1 1 12 0c0 4-3 7-6 12Z"/></g><circle cx="91" cy="59" r="3" fill="#e8b93c"/></svg>; }

export const BODY_DOODLES: DecorativeDoodle[] = [
  { id: 'eye', zones: ['head_eyes'], indicators: ['eye-pressure'], render: <EyeDoodle /> },
  { id: 'heart-ecg', zones: ['thorax'], indicators: ['heart-rate'], render: <HeartEcgDoodle /> },
  { id: 'lungs', zones: ['thorax'], indicators: ['spo2'], render: <LungsDoodle /> },
  { id: 'blood-pressure', zones: ['thorax'], indicators: ['blood-pressure'], render: <BloodPressureDoodle /> },
  { id: 'glucose', zones: ['abdomen'], indicators: ['glucose'], render: <GlucoseDoodle /> },
  { id: 'kidney', zones: ['abdomen'], indicators: ['urine-specific-gravity'], render: <KidneyHydrationDoodle /> },
  { id: 'spine', zones: ['pelvis_spine'], indicators: ['bone'], render: <SpineBoneDoodle /> },
  { id: 'muscle', zones: ['arms_hands'], indicators: ['muscle'], render: <MuscleDoodle /> },
  { id: 'thermometer', zones: ['whole_body'], indicators: ['temperature'], render: <ThermometerDoodle /> },
  { id: 'atom', zones: ['whole_body'], indicators: ['radiation-daily', 'radiation-cumulative'], render: <AtomDoodle /> },
  { id: 'co2', zones: ['whole_body'], indicators: ['co2'], render: <CarbonDioxideDoodle /> }
];
