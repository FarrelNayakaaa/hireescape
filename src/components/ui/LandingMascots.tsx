"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useUiEnvironment } from "./environment";

const mascots = [
  { side: "left", src: "/mascot/welcome.png", size: 1254, greeting: "Hey, welcome!" },
  { side: "right", src: "/mascot/key.png", size: 1254, greeting: "Hi, adventurer!" },
] as const;
type Side = typeof mascots[number]["side"];

export function LandingMascots() {
  const [pageLoaded, setPageLoaded] = useState(false);
  const [assets, setAssets] = useState<Record<Side, "loading" | "ready" | "error">>({ left: "loading", right: "loading" });
  const { ready, reducedMotion } = useUiEnvironment();
  const slide = ready && !reducedMotion;

  useEffect(() => {
    let frame = 0;
    // Wait for a painted, loaded page, including when arriving via client navigation.
    const reveal = () => { frame = requestAnimationFrame(() => setPageLoaded(true)); };
    if (document.readyState === "complete") reveal();
    else window.addEventListener("load", reveal, { once: true });
    return () => {
      window.removeEventListener("load", reveal);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <div className="he-landing-mascots" aria-hidden="true">
    {mascots.map(({ side, src, size, greeting }, index) => {
      const visible = pageLoaded && assets[side] === "ready";
      return <motion.div
        key={side}
        className={`he-landing-mascot he-landing-mascot--${side}`}
        data-visible={visible}
        initial={{ opacity: 0 }}
        animate={{
          opacity: visible ? 1 : 0,
          // Half a viewport puts the entire character beyond its screen edge at every supported width.
          x: !visible && slide ? (side === "left" ? "-50vw" : "50vw") : "0vw",
          y: visible && slide ? [0, -6, 0] : 0,
        }}
        transition={{
          duration: visible ? (slide ? 0.6 : 0.15) : 0,
          delay: visible && slide ? 0.2 + index * 0.3 : 0,
          ease: "easeOut",
          // Begin the gentle loop after the horizontal entrance completes.
          y: { duration: visible && slide ? 2.4 : 0, delay: visible && slide ? 0.8 + index * 0.3 : 0, times: [0, 0.5, 1], ease: "easeInOut", repeat: visible && slide ? Infinity : 0 },
        }}
      >
        <p className="he-mascot-greeting">{greeting}</p>
        <Image src={src} alt="" width={size} height={size} sizes="(max-width: 1279px) 200px, (max-width: 1749px) 24vw, 420px"
          className="he-mascot-image" onLoad={() => setAssets((current) => ({ ...current, [side]: "ready" }))}
          onError={() => setAssets((current) => ({ ...current, [side]: "error" }))} />
      </motion.div>;
    })}
  </div>;
}
