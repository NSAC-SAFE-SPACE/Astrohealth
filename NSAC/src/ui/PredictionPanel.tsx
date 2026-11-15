import React, { useEffect, useMemo, useRef, useState } from 'react';
import { db, type PredictionRecord } from '../db';
import { isBodyComplete, isMentalComplete, type MissingPredictionField, type MentalPredictionPayload } from '../services/predictionCompleteness';
import { predictBody, predictMental, type PredictionApiResult, type PredictionKind } from '../services/predictionApi';

type Props = {
  kind: PredictionKind;
  astronautId: string;
  payload: Record<string, unknown>;
  missing: MissingPredictionField[];
  total: number;
  onMissingField: (field: MissingPredictionField) => void;
};

function recordToResult(record: PredictionRecord): PredictionApiResult {
  return { kind: record.kind, raw: JSON.parse(record.responseJson) as unknown, apiVersion: record.apiVersion ?? 'non fournie' };
}

export const PredictionPanel: React.FC<Props> = ({ kind, astronautId, payload, missing, total, onMissingField }) => {
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [latest, setLatest] = useState<PredictionRecord | null>(null);
  const [history, setHistory] = useState<PredictionRecord[]>([]);
  const complete = kind === 'body' ? isBodyComplete(payload) : isMentalComplete(payload);
  const currentRequest = useMemo(() => JSON.stringify(payload), [payload]);
  const isStale = Boolean(latest && latest.requestJson !== currentRequest);

  useEffect(() => {
    let active = true;
    setLatest(null); setHistory([]); setError(''); setBusy(false); busyRef.current = false;
    if (astronautId) db.predictionRecords.where('astronautId').equals(astronautId).toArray()
      .then((records) => {
        const filtered = records.filter((record) => record.kind === kind).sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
        if (active) { setHistory(filtered); setLatest(filtered[0] ?? null); }
      })
      .catch(() => { if (active) setError('Impossible de charger l’historique local des prédictions.'); });
    return () => { active = false; };
  }, [astronautId, kind]);

  const run = async () => {
    if (busyRef.current) return;
    const canRun = kind === 'body' ? isBodyComplete(payload) : isMentalComplete(payload);
    if (!canRun) { setError('Complétez et validez chaque paramètre avant de lancer la prédiction.'); return; }
    busyRef.current = true; setBusy(true); setError('');
    try {
      const result = kind === 'body'
        ? await predictBody(payload)
        : await predictMental(payload as unknown as MentalPredictionPayload);
      const record: PredictionRecord = {
        id: `prediction-${astronautId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        astronautId, kind, createdAt: Date.now(), apiVersion: result.apiVersion,
        requestJson: currentRequest, responseJson: JSON.stringify(result.raw)
      };
      await db.predictionRecords.put(record);
      setLatest(record);
      setHistory((records) => [record, ...records].slice(0, 10));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La prédiction a échoué. Réessayez.');
    } finally { busyRef.current = false; setBusy(false); }
  };

  const parsedLatest = latest ? recordToResult(latest) : null;
  const missingCount = missing.some((field) => field.key === 'assessment') ? total : missing.filter((field) => field.key !== 'payload').length;
  const count = Math.max(0, total - missingCount);
  return <section className="space-y-4 rounded-2xl border border-slate-border bg-white p-5 sm:p-7" aria-labelledby={`prediction-${kind}-title`}>
    <div><p className="text-xs font-bold uppercase tracking-wider text-primary">Suite</p><h2 id={`prediction-${kind}-title`} className="mt-1 font-serif text-2xl font-bold text-slate-text">Prédiction</h2>
      <p className="mt-1 text-sm text-slate-muted">Mesures complètes : {count} sur {total}</p></div>
    {!complete && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-semibold">Il manque des paramètres pour cette prédiction :</p>
      <ul className="mt-2 space-y-1">{missing.map((field) => <li key={field.key} className="flex flex-wrap items-center justify-between gap-2"><span>{field.label}{field.stale ? ' — à actualiser' : ''}</span><button type="button" className="font-semibold underline underline-offset-2" onClick={() => onMissingField(field)}>Saisir / actualiser</button></li>)}</ul></div>}
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <button type="button" disabled={!complete || busy} onClick={run} className="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{busy ? 'Prédiction en cours…' : error ? 'Réessayer' : 'Lancer la prédiction'}</button>
    {parsedLatest && <div className="space-y-3 rounded-xl border border-slate-border bg-surface p-4">
      {isStale ? <p role="status" className="font-semibold text-amber-800">Résultat obsolète, relancez la prédiction après avoir actualisé les mesures.</p> : <p className="text-sm font-semibold text-slate-text">Résultat de l’API · version {parsedLatest.apiVersion} · {new Date(latest!.createdAt).toLocaleString()}</p>}
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-xs text-slate-text">{typeof parsedLatest.raw === 'string' ? parsedLatest.raw : JSON.stringify(parsedLatest.raw, null, 2)}</pre>
      <details className="rounded-lg border border-slate-border bg-white p-3"><summary className="cursor-pointer text-xs font-semibold">Paramètres exacts envoyés</summary><pre className="mt-2 whitespace-pre-wrap break-words text-xs">{JSON.stringify(JSON.parse(latest!.requestJson), null, 2)}</pre></details>
      <p className="text-xs text-slate-muted">Aide à la décision de démonstration, pas un diagnostic médical.</p>
    </div>}
    {history.length > 1 && <details className="rounded-xl border border-slate-border p-4"><summary className="cursor-pointer text-sm font-semibold">Historique des prédictions ({history.length})</summary><ol className="mt-3 space-y-2">{history.slice(1).map((record) => <li key={record.id} className="border-t border-slate-border pt-2 text-xs"><span className="font-semibold">{new Date(record.createdAt).toLocaleString()}</span><span className="ml-2 text-slate-muted">Version {record.apiVersion ?? 'non fournie'}</span><pre className="mt-1 whitespace-pre-wrap break-words">{JSON.stringify(JSON.parse(record.responseJson), null, 2)}</pre><details className="mt-2"><summary className="cursor-pointer font-semibold">Paramètres envoyés</summary><pre className="mt-1 whitespace-pre-wrap break-words">{JSON.stringify(JSON.parse(record.requestJson), null, 2)}</pre></details></li>)}</ol></details>}
    <p className="text-xs text-slate-muted">Chaque appel envoie uniquement les champs requis par le modèle ; l’identifiant et le nom du profil restent dans l’historique local.</p>
  </section>;
};
