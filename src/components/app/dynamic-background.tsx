import { useEffect, useRef, useState } from "react";
import { useTheme } from "./theme-provider";

export function DynamicBackground() {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : false
  );

  // Synchronize with active dark mode class on <html>
  useEffect(() => {
    const updateDarkState = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    updateDarkState();

    const observer = new MutationObserver(updateDarkState);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", updateDarkState);

    return () => {
      observer.disconnect();
      mql.removeEventListener("change", updateDarkState);
    };
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number | null = null;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Spotlight coordinates with smooth lerp
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight * 0.4;
    let targetX = mouseX;
    let targetY = mouseY;
    let hasUserInteracted = false;
    let lastMoveTime = performance.now();

    // Resize canvas respecting device pixel ratio for razor-sharp dots
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    const onPointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      hasUserInteracted = true;
      lastMoveTime = performance.now();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });

    // Grid configuration
    const SPACING = 28;
    const BASE_RADIUS = 1.15;
    const SPOTLIGHT_RADIUS = 340;

    let isRunning = true;

    const render = (time: number) => {
      if (!isRunning) return;

      // Handle idle ambient drift when user is not moving the mouse
      const idleTime = time - lastMoveTime;
      const isIdle = !hasUserInteracted || idleTime > 2500;

      if (isIdle) {
        // Slow, elegant Lissajous curve for ambient breathing
        const idleX = width * 0.5 + Math.sin(time * 0.0006) * width * 0.32;
        const idleY = height * 0.45 + Math.cos(time * 0.0008) * height * 0.24;
        targetX += (idleX - targetX) * 0.02;
        targetY += (idleY - targetY) * 0.02;
      }

      // Smooth inertia interpolation
      mouseX += (targetX - mouseX) * 0.075;
      mouseY += (targetY - mouseY) * 0.075;

      ctx.clearRect(0, 0, width, height);

      // 1. Draw subtle ambient spotlight glow on the canvas background
      const ambientGrad = ctx.createRadialGradient(
        mouseX,
        mouseY,
        0,
        mouseX,
        mouseY,
        SPOTLIGHT_RADIUS * 1.2
      );

      if (isDark) {
        ambientGrad.addColorStop(0, "rgba(99, 102, 241, 0.14)"); // Indigo starlight
        ambientGrad.addColorStop(0.5, "rgba(59, 130, 246, 0.06)"); // Deep cyan
        ambientGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      } else {
        ambientGrad.addColorStop(0, "rgba(199, 210, 254, 0.38)"); // Soft sky lavender
        ambientGrad.addColorStop(0.5, "rgba(243, 232, 255, 0.18)"); // Whisper violet
        ambientGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      }

      ctx.fillStyle = ambientGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Draw crisp dot matrix
      const cols = Math.ceil(width / SPACING) + 1;
      const rows = Math.ceil(height / SPACING) + 1;
      const startX = (width % SPACING) / 2;
      const startY = (height % SPACING) / 2;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = startX + i * SPACING;
          const y = startY + j * SPACING;

          const dx = x - mouseX;
          const dy = y - mouseY;
          const distSq = dx * dx + dy * dy;
          const maxDistSq = SPOTLIGHT_RADIUS * SPOTLIGHT_RADIUS;

          let r = BASE_RADIUS;
          let alpha = isDark ? 0.08 : 0.06;
          let isSpotlight = false;

          if (distSq < maxDistSq) {
            const dist = Math.sqrt(distSq);
            const factor = 1 - dist / SPOTLIGHT_RADIUS;
            const glow = factor * factor;

            r = BASE_RADIUS + glow * 1.1;
            alpha += isDark ? glow * 0.42 : glow * 0.32;
            isSpotlight = true;
          }

          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);

          if (isSpotlight) {
            ctx.fillStyle = isDark
              ? `rgba(196, 181, 253, ${alpha})` // Luminous lavender spotlight
              : `rgba(99, 102, 241, ${alpha})`; // Soft indigo spotlight
          } else {
            ctx.fillStyle = isDark
              ? `rgba(255, 255, 255, ${alpha})`
              : `rgba(15, 23, 42, ${alpha})`;
          }
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    // Pause when page is hidden to save battery & CPU
    const onVisibilityChange = () => {
      if (document.hidden) {
        isRunning = false;
        if (animId !== null) {
          cancelAnimationFrame(animId);
          animId = null;
        }
      } else {
        if (!isRunning) {
          isRunning = true;
          lastMoveTime = performance.now();
          animId = requestAnimationFrame(render);
        }
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    animId = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animId !== null) {
        cancelAnimationFrame(animId);
      }
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isDark]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-50 pointer-events-none overflow-hidden select-none"
    >
      <canvas
        ref={canvasRef}
        className="size-full absolute inset-0 block"
      />
    </div>
  );
}
