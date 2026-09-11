import assert from "node:assert/strict";
import test from "node:test";
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

test("starts balanced, observes real frames, and probes up only after sustained headroom", () => {
  const policy = new AdaptiveQualityController();
  assert.equal(policy.getSample().level, INITIAL_QUALITY_LEVEL);
  assert.equal(renderFor(policy, 60, 8).level, INITIAL_QUALITY_LEVEL);
  assert.equal(renderFor(policy, 60, 3).level, 3);
  assert.equal(renderFor(policy, 60, 12).level, 4);
  assert.equal(renderFor(policy, 144, 30).level, 4);
});

test("sustained overload quickly removes expensive passes and reaches the bounded emergency DPR", () => {
  const policy = new AdaptiveQualityController(4);
  assert.equal(renderFor(policy, 20, 3).level, 2);
  const sample = renderFor(policy, 20, 5);
  assert.equal(sample.level, 0);
  assert.equal(sample.dpr, MINIMUM_DPR);
  assert.equal(sample.limited, true);
  assert.equal(renderFor(policy, 5, 15).dpr, MINIMUM_DPR);
});

test("hidden, loading, invalid, and resumed-tab intervals do not change quality", () => {
  const policy = new AdaptiveQualityController();
  for (let i = 0; i < 200; i++) policy.addFrame(100, false);
  for (const delta of [10000, NaN, Infinity, -1, 0])
    assert.equal(policy.addFrame(delta), null);
  assert.equal(renderFor(policy, 60, 1).level, INITIAL_QUALITY_LEVEL);
  assert.equal(policy.getSample().fps, null);
});

test("repeated very slow visible frames downgrade instead of resetting warmup forever", () => {
  const policy = new AdaptiveQualityController(4);
  assert.equal(policy.addFrame(700), null);
  assert.equal(policy.addFrame(700), null);
  assert.equal(policy.addFrame(700)?.level, 2);
  assert.equal(policy.addFrame(700)?.level, 0);
  assert.equal(policy.addFrame(700)?.dpr, MINIMUM_DPR);
  assert.equal(policy.getSample().limited, true);

  const pausedPolicy = new AdaptiveQualityController(4);
  pausedPolicy.addFrame(700);
  pausedPolicy.addFrame(700);
  pausedPolicy.addFrame(700, false);
  assert.equal(pausedPolicy.addFrame(700), null);
  assert.equal(pausedPolicy.getSample().level, 4);
});

test("a failed quality probe rolls back and cannot oscillate immediately back up", () => {
  const policy = new AdaptiveQualityController();
  assert.equal(renderFor(policy, 60, 11).level, 3);
  // The lower profile restores 60 FPS; stop feeding overloaded frames as soon
  // as the renderer would apply it, instead of simulating permanent overload.
  for (let i = 0; i < 100 && policy.getSample().level === 3; i++)
    policy.addFrame(40);
  assert.equal(policy.getSample().level, 2);
  assert.equal(renderFor(policy, 60, 20).level, 2);
  assert.equal(renderFor(policy, 60, 10).level, 3);
});

test("a stable 30 Hz display keeps its quality and can cautiously probe upward", () => {
  const policy = new AdaptiveQualityController();
  assert.equal(renderFor(policy, 30, 15).level, INITIAL_QUALITY_LEVEL);
  assert.equal(renderFor(policy, 30, 8).level, 3);
});

test("mixed frame pacing below 34 FPS lowers quality before sustained sub-30 rendering", () => {
  const policy = new AdaptiveQualityController();
  renderFor(policy, 60, 2);
  for (
    let i = 0;
    i < 100 && policy.getSample().level === INITIAL_QUALITY_LEVEL;
    i++
  )
    policy.addFrame(i % 2 ? 40 : 22);
  assert.equal(policy.getSample().level, 1);
});

test("pixel ratio is capped to the display without lowering effects quality", () => {
  const policy = new AdaptiveQualityController(4);
  assert.equal(policy.getSample(1).dpr, 1);
  assert.equal(policy.getSample(3).dpr, 2);
  assert.equal(policy.getSample(NaN).dpr, 1);
  assert.equal(policy.getSample(1).level, 4);
});
