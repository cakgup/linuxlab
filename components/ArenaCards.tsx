import Link from "next/link";
import { ArrowRight, Flag } from "lucide-react";
import { arenas } from "@/lib/ctf-arenas";

export function ArenaCards() {
  return <div className="rooms arena-cards">{arenas.map((arena, index) => <Link href={arena.href} className="room-card" key={arena.id}>
    <div className="room-card-top"><Flag size={24} /><span className="complete-chip">Langsung tersedia</span></div>
    <div className="path-kicker">CTF {index + 1} · {arena.level}</div><h3>{arena.title}</h3><p>{arena.description}</p><span className="tag">{arena.topics}</span>
    <span className="room-card-action">Mulai CTF <ArrowRight size={14} /></span>
  </Link>)}</div>;
}
