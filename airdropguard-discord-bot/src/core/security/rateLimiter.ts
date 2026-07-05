interface WindowState {
  timestamps: number[];
}

export class SlidingWindowLimiter {
  private readonly windows = new Map<string, WindowState>();

  public constructor(
    private readonly maxEvents: number,
    private readonly windowMs: number
  ) {}

  public hit(key: string): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now();
    const state = this.windows.get(key) ?? { timestamps: [] };
    state.timestamps = state.timestamps.filter((ts) => now - ts <= this.windowMs);

    if (state.timestamps.length >= this.maxEvents) {
      const oldest = state.timestamps[0];
      const retryAfterMs = Math.max(0, this.windowMs - (now - oldest));
      this.windows.set(key, state);
      return { allowed: false, retryAfterMs };
    }

    state.timestamps.push(now);
    this.windows.set(key, state);
    return { allowed: true, retryAfterMs: 0 };
  }
}
