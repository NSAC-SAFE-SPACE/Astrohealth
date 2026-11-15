/**
 * 1D Kalman Filter for single-variable biomedical time-series tracking.
 * Provides optimal estimate of true physiological state and dynamic error covariance.
 */
export class Kalman1D {
  private x: number; // State estimate
  private p: number; // Error covariance
  private q: number; // Process noise covariance (drift per day)
  private r: number; // Measurement noise covariance
  private lastTimestampMs: number;
  private initialized: boolean = false;

  constructor(
    initialState: number = 0,
    processNoiseQ: number = 0.1,
    measurementNoiseR: number = 2.0,
    initialP: number = 10.0
  ) {
    this.x = initialState;
    this.p = initialP;
    this.q = processNoiseQ;
    this.r = measurementNoiseR;
    this.lastTimestampMs = Date.now();
    this.initialized = initialState !== 0;
  }

  public init(value: number, timestampMs: number = Date.now()): void {
    this.x = value;
    this.p = this.r; // Initial uncertainty equals measurement noise
    this.lastTimestampMs = timestampMs;
    this.initialized = true;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public getState(): number {
    return this.x;
  }

  public getCovariance(): number {
    return this.p;
  }

  /**
   * Update the filter with a new measurement
   */
  public update(measurement: number, timestampMs: number = Date.now(), customR?: number): void {
    if (!this.initialized) {
      this.init(measurement, timestampMs);
      return;
    }

    // Time elapsed in days
    const deltaDays = Math.max(0.01, (timestampMs - this.lastTimestampMs) / 86400000);
    this.lastTimestampMs = timestampMs;

    // Prediction step: variance increases over elapsed time
    const pPredicted = this.p + this.q * deltaDays;

    // Measurement update step
    const effectiveR = customR ?? this.r;
    const kalmanGain = pPredicted / (pPredicted + effectiveR);

    // State update
    this.x = this.x + kalmanGain * (measurement - this.x);
    // Covariance update
    this.p = (1 - kalmanGain) * pPredicted;
  }

  /**
   * Predict future state and uncertainty bounds [low, high] for a given horizon in days.
   */
  public predict(horizonDays: number, zScore: number = 1.96): { value: number; low: number; high: number } {
    if (!this.initialized) {
      return { value: 0, low: 0, high: 0 };
    }

    // Variance increases with horizon time
    const futureVariance = this.p + this.q * horizonDays + this.r;
    const margin = zScore * Math.sqrt(futureVariance);

    return {
      value: this.x,
      low: this.x - margin,
      high: this.x + margin
    };
  }

  public reset(initialState: number = 0): void {
    this.x = initialState;
    this.p = 10.0;
    this.initialized = false;
    this.lastTimestampMs = 0;
  }
}
