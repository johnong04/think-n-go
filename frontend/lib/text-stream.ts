"use client";

export type StreamHandle = {
  promise: Promise<void>;
  abort: () => void;
};

export type StreamOpts = {
  charsPerTick?: number;
  tickMs?: number;
};

/** Char-by-char emitter. Calls onChunk with the cumulative text after each tick.
 *  Defaults: 2 chars / 20 ms ≈ 100 chars/sec, ~2.5s for a 250-char paragraph. */
export function streamText(
  text: string,
  onChunk: (textSoFar: string) => void,
  opts: StreamOpts = {}
): StreamHandle {
  const charsPerTick = opts.charsPerTick ?? 2;
  const tickMs = opts.tickMs ?? 20;
  let cursor = 0;
  let aborted = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const promise = new Promise<void>((resolve) => {
    if (!text) {
      onChunk("");
      resolve();
      return;
    }

    function tick() {
      if (aborted) {
        resolve();
        return;
      }
      cursor = Math.min(cursor + charsPerTick, text.length);
      onChunk(text.slice(0, cursor));
      if (cursor >= text.length) {
        resolve();
        return;
      }
      timer = setTimeout(tick, tickMs);
    }

    tick();
  });

  return {
    promise,
    abort: () => {
      aborted = true;
      if (timer) clearTimeout(timer);
    },
  };
}
