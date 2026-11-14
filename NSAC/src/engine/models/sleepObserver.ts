import type { SleepLog } from '../../types';

export class SleepObserver {
  private recentSleepLogs: { hours: number; timestamp: number }[] = [];
  private readonly maxWindowDays: number = 14;

  public addLog(hours: number, timestamp: number = Date.now()): void {
    this.recentSleepLogs.push({ hours, timestamp });
    this.cleanup();
  }

  public addSleepLog(log: SleepLog): void {
    const ts = new Date(log.date).getTime() || Date.now();
    this.addLog(log.hours, ts);
  }

  public getAverageHours(days: number = 7): number {
    if (this.recentSleepLogs.length === 0) return 7.5; // Nominal fallback
    const cutoff = Date.now() - days * 86400000;
    const relevant = this.recentSleepLogs.filter((l) => l.timestamp >= cutoff);
    const set = relevant.length > 0 ? relevant : this.recentSleepLogs;
    const sum = set.reduce((acc, curr) => acc + curr.hours, 0);
    return Math.round((sum / set.length) * 10) / 10;
  }

  public getSleepDeficit(targetHours: number = 7.5, days: number = 3): number {
    const avg = this.getAverageHours(days);
    return Math.round((targetHours - avg) * 10) / 10;
  }

  private cleanup(): void {
    const cutoff = Date.now() - this.maxWindowDays * 86400000;
    this.recentSleepLogs = this.recentSleepLogs.filter((l) => l.timestamp >= cutoff);
  }

  public reset(): void {
    this.recentSleepLogs = [];
  }
}
