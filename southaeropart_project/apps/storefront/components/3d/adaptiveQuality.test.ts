import { describe, it, expect } from "vitest";
import { isCustomQuality, qualityForLevel } from "./renderingPreferences";
import {
  AdaptiveQualityController,
  INITIAL_QUALITY_LEVEL,
  MINIMUM_DPR,
} from "./adaptiveQuality";

function renderFor(
  controller: AdaptiveQualityController,
  fps: number,
  seconds: number,
) {
  for (let i = 0; i < Math.ceil(fps * seconds); i++)
    controller.addFrame(1000 / fps);
  return controller.getSample();
}

describe("AdaptiveQualityController", () => {
  it("manual mode reports FPS without changing quality, even during severe overload", () => {
    const controller = new AdaptiveQualityController(3);
    for (let i = 0; i < 100; i++) controller.addFrame(100, true, 2, false);
    expect(controller.getSample().level).toBe(3);
    expect(controller.getSample().fps).toBe(10);
    for (let i = 0; i < 10; i++) controller.addFrame(1000, true, 2, false);
    expect(controller.getSample().level).toBe(3);
    expect(controller.getSample().dpr).toBe(1.5);
    for (let i = 0; i < 2000; i++) controller.addFrame(1000 / 60, true, 2, false);
    expect(controller.getSample().level).toBe(3);
    controller.pause();
    for (let i = 0; i < 100; i++) controller.addFrame(100, true, 2, true);
    expect(controller.getSample().level).toBe(0);
  });

  it("manual presets are independent and individual detail changes are shown as custom", () => {
    const preset = qualityForLevel(3);
    expect(isCustomQuality(preset)).toBe(false);
    expect(preset.glassRefraction).toBe(true);
    expect(isCustomQuality({ ...preset, reflections: false })).toBe(true);
    expect(isCustomQuality({ ...preset, glassRefraction: false })).toBe(true);
    expect(qualityForLevel(3).reflections).toBe(true);
  });

  it("starts balanced, observes real frames, and probes up only after sustained headroom", () => {
    const policy = new AdaptiveQualityController();
    expect(policy.getSample().level).toBe(INITIAL_QUALITY_LEVEL);
    expect(renderFor(policy, 60, 8).level).toBe(INITIAL_QUALITY_LEVEL);
    expect(renderFor(policy, 60, 3).level).toBe(3);
    expect(renderFor(policy, 60, 12).level).toBe(4);
    expect(renderFor(policy, 144, 30).level).toBe(4);
  });

  it("sustained overload quickly removes expensive passes and reaches the bounded emergency DPR", () => {
    const policy = new AdaptiveQualityController(4);
    expect(renderFor(policy, 20, 3).level).toBe(2);
    const sample = renderFor(policy, 20, 5);
    expect(sample.level).toBe(0);
    expect(sample.dpr).toBe(MINIMUM_DPR);
    expect(sample.limited).toBe(true);
    expect(renderFor(policy, 5, 15).dpr).toBe(MINIMUM_DPR);
  });

  it("hidden, loading, invalid, and resumed-tab intervals do not change quality", () => {
    const policy = new AdaptiveQualityController();
    for (let i = 0; i < 200; i++) policy.addFrame(100, false);
    for (const delta of [10000, NaN, Infinity, -1, 0])
      expect(policy.addFrame(delta)).toBeNull();
    expect(renderFor(policy, 60, 1).level).toBe(INITIAL_QUALITY_LEVEL);
    expect(policy.getSample().fps).toBeNull();
  });

  it("repeated very slow visible frames downgrade instead of resetting warmup forever", () => {
    const policy = new AdaptiveQualityController(4);
    expect(policy.addFrame(700)).toBeNull();
    expect(policy.addFrame(700)).toBeNull();
    expect(policy.addFrame(700)?.level).toBe(2);
    expect(policy.addFrame(700)?.level).toBe(0);
    expect(policy.addFrame(700)?.dpr).toBe(MINIMUM_DPR);
    expect(policy.getSample().limited).toBe(true);

    const pausedPolicy = new AdaptiveQualityController(4);
    pausedPolicy.addFrame(700);
    pausedPolicy.addFrame(700);
    pausedPolicy.addFrame(700, false);
    expect(pausedPolicy.addFrame(700)).toBeNull();
    expect(pausedPolicy.getSample().level).toBe(4);
  });

  it("a failed quality probe rolls back and cannot oscillate immediately back up", () => {
    const policy = new AdaptiveQualityController();
    expect(renderFor(policy, 60, 11).level).toBe(3);
    for (let i = 0; i < 100 && policy.getSample().level === 3; i++)
      policy.addFrame(40);
    expect(policy.getSample().level).toBe(2);
    expect(renderFor(policy, 60, 20).level).toBe(2);
    expect(renderFor(policy, 60, 10).level).toBe(3);
  });

  it("a stable 30 Hz display keeps its quality and can cautiously probe upward", () => {
    const policy = new AdaptiveQualityController();
    expect(renderFor(policy, 30, 15).level).toBe(INITIAL_QUALITY_LEVEL);
    expect(renderFor(policy, 30, 8).level).toBe(3);
  });

  it("mixed frame pacing below 34 FPS lowers quality before sustained sub-30 rendering", () => {
    const policy = new AdaptiveQualityController();
    renderFor(policy, 60, 2);
    for (
      let i = 0;
      i < 100 && policy.getSample().level === INITIAL_QUALITY_LEVEL;
      i++
    )
      policy.addFrame(i % 2 ? 40 : 22);
    expect(policy.getSample().level).toBe(1);
  });

  it("pixel ratio is capped to the display without lowering effects quality", () => {
    const policy = new AdaptiveQualityController(4);
    expect(policy.getSample(1).dpr).toBe(1);
    expect(policy.getSample(3).dpr).toBe(2);
    expect(policy.getSample(NaN).dpr).toBe(1);
    expect(policy.getSample(1).level).toBe(4);
  });
});
