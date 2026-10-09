// Rest-timer alerts. iPhone Safari has no vibration API and only plays Web Audio after a tap,
// so the audio context is unlocked on the first touch and reused.

let ctx: AudioContext | null = null;

export function unlockAudio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    // A silent blip keeps iOS from re-suspending the context.
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.01);
  } catch {
    /* audio unavailable */
  }
}

export function beep() {
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
  const t0 = ctx.currentTime + 0.02;
  [0, 0.28, 0.56].forEach((offset, i) => {
    const o = ctx!.createOscillator();
    const g = ctx!.createGain();
    o.type = 'square';
    o.frequency.value = i === 2 ? 1320 : 880;
    const t = t0 + offset;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g).connect(ctx!.destination);
    o.start(t);
    o.stop(t + 0.22);
  });
}

export function vibrate() {
  try {
    navigator.vibrate?.([300, 120, 300]);
  } catch {
    /* not supported (iPhone) */
  }
}
