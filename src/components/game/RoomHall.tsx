"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, KeyRound, LockKeyhole } from "lucide-react";
import type { Room } from "@/lib/contracts";
import { Mascot } from "@/components/ui/Mascot";
import { useUiMotion } from "@/components/ui/environment";
import { DoorOpenTransition } from "./DoorOpenTransition";

export type JourneyCopy = {
  eyebrow: string; title: string; description: string; enter: string; locked: string; complete: string;
  keyEarned: string; rewardDescription: string; collect: string; keys: string; entering: string;
  names: [string, string, string]; goals: [string, string, string];
};

export function RoomHall({ availableRoom, completedRooms, copy, onEnter }: {
  availableRoom: Room; completedRooms: Room[]; copy: JourneyCopy; onEnter(room: Room): void;
}) {
  const [opening, setOpening] = useState<Room | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const { decorative } = useUiMotion();
  useEffect(() => { heading.current?.focus(); }, []);
  return <section className="he-room-hall" aria-labelledby="he-hall-title">
    <div className="he-hall-intro">
      <div><p className="he-eyebrow he-muted">{copy.eyebrow}</p><h1 id="he-hall-title" tabIndex={-1} ref={heading}>{copy.title}</h1><p className="he-muted">{copy.description}</p></div>
      <div className="he-hall-companion"><Mascot className="he-hall-mascot" /><span className="he-chip"><KeyRound size={15} aria-hidden="true" />{completedRooms.length}/3 {copy.keys}</span></div>
    </div>
    <div className="he-hall-doors">{([1, 2, 3] as const).map((room) => {
      const complete = completedRooms.includes(room);
      const available = room === availableRoom && !complete;
      const Icon = complete ? KeyRound : available ? ArrowRight : LockKeyhole;
      return <motion.button key={room} type="button" disabled={!available || opening !== null} onClick={() => setOpening(room)}
        aria-label={`${copy.enter} ${copy.names[room - 1]}`} aria-describedby={`he-hall-door-${room}-status`}
        className={`he-hall-door he-hall-door--${complete ? "complete" : available ? "available" : "locked"} he-accent-room${room}`}
        whileHover={available && decorative ? { y: -8 } : undefined} whileTap={available && decorative ? { scale: 0.98 } : undefined}>
        <span className="he-door-frame" aria-hidden="true"><span className="he-door-light" /><span className="he-door-slab"><span className="he-door-number">0{room}</span><span className="he-door-emblem"><Icon size={38} strokeWidth={1.5} /></span><span className="he-door-handle" /><span className="he-door-panels" /></span></span>
        <span className="he-door-caption"><span className="he-door-title">{copy.names[room - 1]}</span><span className="he-small he-muted">{copy.goals[room - 1]}</span><span id={`he-hall-door-${room}-status`} className="he-door-state"><Icon size={16} aria-hidden="true" />{complete ? copy.complete : available ? copy.enter : copy.locked}{complete && <Check size={14} aria-hidden="true" />}</span></span>
      </motion.button>;
    })}</div>
    {opening && <DoorOpenTransition label={`${copy.entering} ${copy.names[opening - 1]}`} onComplete={() => onEnter(opening)} />}
  </section>;
}
