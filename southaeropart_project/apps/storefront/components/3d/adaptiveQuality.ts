export type QualityLevel = 0 | 1 | 2 | 3 | 4;

export interface QualityProfile {
  readonly level: QualityLevel;
  readonly label: string;
  readonly dpr: number;
  readonly reflections: boolean;
  readonly reflectionResolution: number;
  readonly contactShadowResolution: number;
  readonly shadowMapSize: number;
  readonly postprocessing: boolean;
  readonly ambientOcclusion: boolean;
  readonly multisampling: number;
}

// Effects change together with resolution: lowering DPR alone cannot relieve the
// extra scene renders performed by planar reflections and shadow maps.
export const QUALITY_PROFILES: readonly QualityProfile[] = [
  {
    level: 0,
    label: "Essential",
    dpr: 0.5,
    reflections: false,
    reflectionResolution: 128,
    contactShadowResolution: 128,
    shadowMapSize: 0,
    postprocessing: false,
    ambientOcclusion: false,
    multisampling: 0,
  },
  {
    level: 1,
    label: "Performance",
    dpr: 0.75,
    reflections: false,
    reflectionResolution: 256,
    contactShadowResolution: 256,
    shadowMapSize: 0,
    postprocessing: false,
    ambientOcclusion: false,
    multisampling: 0,
  },
  {
    level: 2,
    label: "Balanced",
    dpr: 1,
    reflections: true,
    reflectionResolution: 256,
    contactShadowResolution: 256,
    shadowMapSize: 1024,
    postprocessing: true,
    ambientOcclusion: false,
    multisampling: 0,
  },
  {
    level: 3,
    label: "High",
    dpr: 1.5,
    reflections: true,
    reflectionResolution: 512,
    contactShadowResolution: 512,
    shadowMapSize: 2048,
    postprocessing: true,
    ambientOcclusion: true,
    multisampling: 2,
  },
  {
    level: 4,
    label: "Ultra",
    dpr: 2,
    reflections: true,
    reflectionResolution: 1024,
    contactShadowResolution: 1024,
    shadowMapSize: 2048,
    postprocessing: true,
    ambientOcclusion: true,
    multisampling: 4,
  },
];

export const INITIAL_QUALITY_LEVEL: QualityLevel = 2;
export const MINIMUM_DPR = 0.35;

export interface AdaptiveQualitySample {
  readonly level: QualityLevel;
  readonly dpr: number;
  readonly fps: number | null;
  /** The minimum settings still miss the target; never imply a guaranteed FPS. */
  readonly limited: boolean;
}

export const INITIAL_QUALITY_SAMPLE: AdaptiveQualitySample = {
  level: INITIAL_QUALITY_LEVEL,
  dpr: QUALITY_PROFILES[INITIAL_QUALITY_LEVEL].dpr,
  fps: null,
  limited: false,
};

const WINDOW_MS = 1000;
const INITIAL_WARMUP_MS = 1500;
const LONG_GAP_MS = 500;
const HEADROOM_MS = 8000;
const CAPPED_DISPLAY_PROBE_MS = 20000;
const DOWNGRADE_COOLDOWN_MS = 20000;

/**
 * Pure frame-time policy, independent of React, wall-clock time, and device names.
 * Feed only rendered frames. Hidden/loading frames and discontinuities reset the
 * observation window, so a resumed tab cannot incorrectly downgrade the GPU.
 */
export class AdaptiveQualityController {
  private level: QualityLevel;
  private dpr: number;
  private fps: number | null = null;
  private frameTimes: number[] = [];
  private windowMs = 0;
  private warmupMs = INITIAL_WARMUP_MS;
  private headroomMs = 0;
  private cappedHeadroomMs = 0;
  private upgradeCooldownMs = 0;
  private consecutiveLongFrames = 0;

  constructor(initialLevel: QualityLevel = INITIAL_QUALITY_LEVEL) {
    this.level = initialLevel;
    this.dpr = QUALITY_PROFILES[initialLevel].dpr;
  }

  getSample(nativeDpr = 2): AdaptiveQualitySample {
    const pixelRatio =
      Number.isFinite(nativeDpr) && nativeDpr > 0 ? nativeDpr : 1;
    return {
      level: this.level,
      dpr: Math.min(pixelRatio, this.dpr),
      fps: this.fps,
      limited:
        this.level === 0 &&
        this.dpr === MINIMUM_DPR &&
        this.fps !== null &&
        this.fps < 29.5,
    };
  }

  pause(): void {
    this.clearWindow();
    this.fps = null;
    this.headroomMs = 0;
    this.cappedHeadroomMs = 0;
    this.warmupMs = INITIAL_WARMUP_MS;
    this.consecutiveLongFrames = 0;
  }

  addFrame(
    frameTimeMs: number,
    active = true,
    nativeDpr = 2,
    automatic = true,
  ): AdaptiveQualitySample | null {
    if (!active || !Number.isFinite(frameTimeMs) || frameTimeMs <= 0) {
      this.pause();
      return null;
    }

    if (frameTimeMs > LONG_GAP_MS) {
      const consecutive = this.consecutiveLongFrames + 1;
      this.pause();
      this.consecutiveLongFrames = consecutive;
      // An isolated main-thread pause is not a benchmark. Repeated very slow
      // *visible* frames are overload, however: otherwise a <2 FPS device would
      // reset warmup forever and never reach the cheaper profiles.
      if (consecutive < 3) return null;
      this.fps = Math.round((1000 / frameTimeMs) * 10) / 10;
      if (automatic) this.lowerQuality(2);
      return this.getSample(nativeDpr);
    }
    this.consecutiveLongFrames = 0;

    if (this.warmupMs > 0) {
      this.warmupMs = Math.max(0, this.warmupMs - frameTimeMs);
      return null;
    }

    this.upgradeCooldownMs = Math.max(0, this.upgradeCooldownMs - frameTimeMs);
    this.frameTimes.push(frameTimeMs);
    this.windowMs += frameTimeMs;
    // A minimum frame count rejects isolated shader/GC stalls while retaining a
    // response to sustained overload, including devices rendering below 10 FPS.
    if (this.windowMs < WINDOW_MS || this.frameTimes.length < 8) return null;

    const measuredMs = this.windowMs;
    const fps = (this.frameTimes.length * 1000) / measuredMs;
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const p90 = sorted[Math.ceil(sorted.length * 0.9) - 1];
    this.fps = Math.round(fps * 10) / 10;
    this.clearWindow();

    // Manual mode still measures FPS but must never change the user's settings.
    if (!automatic) return this.getSample(nativeDpr);

    // A stable 30 Hz display is already meeting the target. Reduce early below
    // 34 FPS when frame pacing also deteriorates, and always below the floor.
    if (fps < 29.5 || (fps < 34 && p90 > 35)) {
      this.lowerQuality(fps < 23 ? 2 : 1);
    } else if (this.upgradeCooldownMs === 0) {
      this.headroomMs =
        fps >= 42 && p90 <= 27 ? this.headroomMs + measuredMs : 0;
      // Probe cautiously on 30 Hz/capped displays, whose RAF timing cannot show
      // unused GPU time. A failed probe is rolled back by the same overload rule.
      this.cappedHeadroomMs =
        fps >= 29.5 && fps <= 34 && p90 <= 35
          ? this.cappedHeadroomMs + measuredMs
          : 0;
      if (
        this.headroomMs >= HEADROOM_MS ||
        this.cappedHeadroomMs >= CAPPED_DISPLAY_PROBE_MS
      ) {
        this.raiseQuality();
      }
    }

    return this.getSample(nativeDpr);
  }

  private lowerQuality(steps: number): void {
    const previousLevel = this.level;
    const previousDpr = this.dpr;
    if (this.level > 0) {
      this.level = Math.max(0, this.level - steps) as QualityLevel;
      this.dpr = QUALITY_PROFILES[this.level].dpr;
    } else {
      this.dpr = MINIMUM_DPR;
    }
    this.headroomMs = 0;
    this.cappedHeadroomMs = 0;
    this.upgradeCooldownMs = DOWNGRADE_COOLDOWN_MS;
    if (previousLevel !== this.level || previousDpr !== this.dpr)
      this.warmupMs = 500;
  }

  private raiseQuality(): void {
    if (this.level === 0 && this.dpr < QUALITY_PROFILES[0].dpr) {
      this.dpr = QUALITY_PROFILES[0].dpr;
    } else if (this.level < QUALITY_PROFILES.length - 1) {
      this.level = (this.level + 1) as QualityLevel;
      this.dpr = QUALITY_PROFILES[this.level].dpr;
    } else {
      return;
    }
    this.headroomMs = 0;
    this.cappedHeadroomMs = 0;
    this.warmupMs = INITIAL_WARMUP_MS;
  }

  private clearWindow(): void {
    this.frameTimes = [];
    this.windowMs = 0;
  }
}
