import { db } from '../../db';
import type { Astronaut, MissionEnvironment } from '../../types';

const SESSION_KEY = 'astrohealth.sessionMatricule';
const LOGOUT_SIGNAL_KEY = 'astrohealth.logoutSignal';
const LOGOUT_CHANNEL = 'astrohealth.auth';
export const AUTH_LOGOUT_EVENT = 'astrohealth:logout';
export const normalizeName = (name: string) => name.trim().toLocaleLowerCase();
export function getSessionMatricule(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(SESSION_KEY) || window.localStorage.getItem(SESSION_KEY);
}
export function getSessionUser(): Promise<Astronaut | undefined> {
  const matricule = getSessionMatricule();
  return matricule ? db.users.get(matricule) : Promise.resolve(undefined);
}
function removeLocalSession(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(SESSION_KEY);
}
function notifyLogout(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(LOGOUT_CHANNEL);
    channel.postMessage({ type: 'logout' });
    channel.close();
  }
  try {
    window.localStorage.setItem(LOGOUT_SIGNAL_KEY, String(Date.now()));
    window.localStorage.removeItem(LOGOUT_SIGNAL_KEY);
  } catch { /* Storage may be disabled; BroadcastChannel still handles supported browsers. */ }
}
export function clearSession(): void {
  removeLocalSession();
  notifyLogout();
}
export function clearSessionFromAnotherTab(): void {
  removeLocalSession();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
}
function startSession(matricule: string): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(SESSION_KEY, matricule.trim());
  window.localStorage.removeItem(SESSION_KEY);
}

export async function signIn(name: string, matricule: string, mission: MissionEnvironment) {
  const cleanedMatricule = String(matricule).trim();
  console.log('matricule:', cleanedMatricule, typeof cleanedMatricule);
  const user = await db.users.get(cleanedMatricule);
  if (!user) throw new Error('Matricule inconnu.');
  if (normalizeName(user.name) !== normalizeName(name)) throw new Error('Le nom ne correspond pas au matricule.');
  const profile = await db.astronauts.get(user.id);
  if (!profile) await db.astronauts.put(user);
  startSession(user.matricule ?? user.id);
  return user;
}

export async function signUp(name: string, matricule: string, mission: MissionEnvironment) {
  const normalizedMatricule = String(matricule).trim();
  console.log('matricule:', normalizedMatricule, typeof normalizedMatricule);
  if (await db.users.get(normalizedMatricule) || (await db.astronauts.toArray()).some((profile) => (profile.matricule ?? profile.id) === normalizedMatricule && profile.id !== 'astro-01')) throw new Error('Ce matricule est déjà enregistré, veuillez vous connecter.');
  const user: Astronaut = { id: normalizedMatricule, matricule: normalizedMatricule, name: name.trim(), age: 0, sex: 'male', weightKg: 0, mission, createdAt: new Date().toISOString(), profileComplete: false, missionDay: 1 };
  await db.transaction('rw', db.users, db.astronauts, async () => { await db.users.add(user); await db.astronauts.put(user); });
  startSession(user.matricule!);
  return user;
}

export async function updateRegisteredUser(matricule: string, details: Partial<Astronaut>) {
  const user = await db.users.get(String(matricule).trim());
  if (!user) throw new Error('Session utilisateur introuvable.');
  const updated = { ...user, ...details, profileComplete: true };
  await db.transaction('rw', db.users, db.astronauts, async () => { await db.users.put(updated); await db.astronauts.put(updated); });
  return updated;
}
