"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { KeyRound } from "lucide-react";
import type { Room } from "@/lib/contracts";
import { Button } from "@/components/ui";
import { Mascot } from "@/components/ui/Mascot";
import { useUiMotion } from "@/components/ui/environment";
import type { JourneyCopy } from "./RoomHall";

export function KeyReward({ room, copy, onCollect }: { room: Room; copy: JourneyCopy; onCollect(): void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const { decorative } = useUiMotion();
  useEffect(() => { heading.current?.focus(); }, []);
  return <section className={`he-key-reward he-accent-room${room}`} aria-labelledby="he-key-title">
    <p className="he-eyebrow">0{room} / {copy.names[room - 1]}</p>
    <div className="he-key-scene"><div className="he-key-halo" aria-hidden="true" /><Mascot state="done" className="he-reward-mascot" />
      <motion.span className="he-reward-key" aria-hidden="true" initial={decorative ? { scale: 0, rotate: -50, y: 50 } : false} animate={{ scale: 1, rotate: 0, y: 0 }} transition={{ type: "spring", stiffness: 140, damping: 14 }}><KeyRound size={58} strokeWidth={1.5} /></motion.span>
    </div>
    <h1 id="he-key-title" ref={heading} tabIndex={-1}>{copy.keyEarned}</h1><p className="he-muted">{copy.rewardDescription}</p>
    <div className="he-reward-slots" aria-label={`${room}/3 ${copy.keys}`}>{([1, 2, 3] as const).map((key) => <span key={key} className={key <= room ? "he-key-slot he-key-slot--earned" : "he-key-slot"}><KeyRound size={25} aria-hidden="true" /></span>)}</div>
    <Button onClick={onCollect}>{copy.collect}</Button>
  </section>;
}
