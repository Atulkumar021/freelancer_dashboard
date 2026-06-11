import { useEffect, useState } from "react";

/** Animates a number from 0 → target with ease-out on mount. */
export function useCountUp(target: number, duration = 900): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf: number;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - t0) / duration, 1);
      setVal(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

/** Renders "₹4.82 Cr" / "40.2%" / "1,284" with the numeric part counting up.
    Non-numeric strings ("—", "N/A") render unchanged. */
export function AnimatedValue({ value }: { value: string }) {
  const m = value.match(/^([^\d-]*)(-?[\d,]+(?:\.\d+)?)(.*)$/);
  const target   = m ? parseFloat(m[2].replace(/,/g, "")) : 0;
  const decimals = m ? (m[2].split(".")[1] ?? "").length : 0;
  const grouped  = m ? m[2].includes(",") : false;
  const v = useCountUp(target);
  if (!m) return <>{value}</>;
  const num = grouped ? Math.round(v).toLocaleString("en-IN") : v.toFixed(decimals);
  return <>{m[1]}{num}{m[3]}</>;
}
