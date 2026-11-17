let audioCtx = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

export function unlockOrderSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

export function playOrderSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const start = () => {
    const now = ctx.currentTime;
    const notes = [880, 1174.7, 1318.5];

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + index * 0.11;

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  };

  if (ctx.state === "suspended") {
    ctx.resume().then(start).catch(() => {});
  } else {
    start();
  }
}

export function showOrderBrowserNotification(order) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;

  try {
    new Notification("Новый заказ", {
      body: `${order.phone} · ${Number(order.total).toLocaleString("ru-RU")} ₸`,
      tag: order.id,
    });
  } catch {
    // ignore notification errors
  }
}
