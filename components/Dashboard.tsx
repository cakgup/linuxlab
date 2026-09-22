"use client";

import Link from "next/link";
import { ArrowRight, Award, CheckCircle2, Lock, RotateCcw, Shield, TerminalSquare, Trophy, Waypoints } from "lucide-react";
import { getRoomsForPath, isRoomComplete, isRoomUnlocked, learningPaths, rooms, totalTasks, totalXp } from "@/lib/tracks";
import { clearProgress, readProgress } from "@/lib/progress";
import { useEffect, useMemo, useState } from "react";
import { Nav } from "./Nav";
import { RoomIcon } from "./RoomIcon";

export function Dashboard() {
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => setCompleted(readProgress().completedTaskIds), []);

  const earnedXp = useMemo(
    () => rooms.flatMap((r) => r.tasks).filter((t) => completed.includes(t.id)).reduce((s, t) => s + t.xp, 0),
    [completed],
  );
  const completedRooms = rooms.filter((r) => isRoomComplete(r, completed)).length;
  const percent = Math.round((completed.length / totalTasks) * 100) || 0;
  const badges = rooms.filter((r) => r.badge && isRoomComplete(r, completed)).map((r) => r.badge as string);

  const reset = () => {
    clearProgress();
    setCompleted([]);
  };

  return (
    <div className="shell">
      <Nav xp={earnedXp} completed={completed.length} />
      <main className="container">
        <section className="hero">
          <div className="eyebrow">TryHackMe-style Linux learning · defender focused</div>
          <h1>Learn Linux first. Then defend it.</h1>
          <p>
            Start with a complete Linux command-line foundation, unlock the cybersecurity path, and finish with a guided
            incident-response room. Every lab runs in a safe browser simulation and validates the resulting host state.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" href="/room/basic-navigation">Start Linux Basics <ArrowRight size={17} /></Link>
            {completed.length > 0 && <button className="btn" onClick={reset}><RotateCcw size={16} /> Reset learning progress</button>}
          </div>
        </section>

        <section className="stats">
          <div className="stat"><TerminalSquare size={19} /><strong>{rooms.length}</strong><span>interactive rooms</span></div>
          <div className="stat"><Waypoints size={19} /><strong>{totalTasks}</strong><span>hands-on tasks</span></div>
          <div className="stat"><Trophy size={19} /><strong>{earnedXp}/{totalXp}</strong><span>XP earned</span></div>
          <div className="stat"><Shield size={19} /><strong>{percent}%</strong><span>learning path complete</span></div>
        </section>

        {badges.length > 0 && (
          <section className="badge-shelf">
            <div className="badge-shelf-title"><Award size={18} /> Earned badges</div>
            <div className="earned-badges">{badges.map((badge) => <span key={badge}><CheckCircle2 size={14} />{badge}</span>)}</div>
          </section>
        )}

        {learningPaths.map((path, pathIndex) => {
          const pathRooms = getRoomsForPath(path.name);
          const pathCompleted = pathRooms.filter((room) => isRoomComplete(room, completed)).length;
          const pathTasks = pathRooms.flatMap((room) => room.tasks);
          const pathDoneTasks = pathTasks.filter((task) => completed.includes(task.id)).length;
          const pathPercent = Math.round((pathDoneTasks / pathTasks.length) * 100) || 0;
          const pathUnlocked = pathRooms.some((room) => isRoomUnlocked(room, completed));

          return (
            <section className="learning-path" key={path.name}>
              <div className="section-title path-title">
                <div>
                  <div className="path-kicker">PATH {String(pathIndex + 1).padStart(2, "0")} · {path.accent}</div>
                  <h2>{path.name}</h2>
                  <p>{path.description}</p>
                </div>
                <div className="path-progress-summary">
                  <strong>{pathPercent}%</strong>
                  <span>{pathCompleted}/{pathRooms.length} rooms</span>
                </div>
              </div>

              {!pathUnlocked && (
                <div className="path-locked-banner"><Lock size={15} /> Complete the previous learning path to unlock these rooms.</div>
              )}

              <div className="rooms">
                {pathRooms.map((room) => {
                  const done = room.tasks.filter((t) => completed.includes(t.id)).length;
                  const p = Math.round((done / room.tasks.length) * 100);
                  const unlocked = isRoomUnlocked(room, completed);
                  const complete = isRoomComplete(room, completed);
                  const card = (
                    <>
                      <div className="room-card-top">
                        <RoomIcon icon={room.icon} />
                        {!unlocked ? <span className="lock-chip"><Lock size={12} /> Locked</span> : complete ? <span className="complete-chip"><CheckCircle2 size={12} /> Complete</span> : null}
                      </div>
                      <h3>{room.title}</h3>
                      <p>{room.description}</p>
                      <div className="tag-row">
                        <span className={`badge badge-${room.difficulty.toLowerCase()}`}>{room.difficulty}</span>
                        {room.tags.slice(0, 3).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
                      </div>
                      <div className="room-footer">
                        <div className="progress-line"><div style={{ width: `${p}%` }} /></div>
                        <div className="progress-meta"><span>{done}/{room.tasks.length} tasks</span><span>{room.duration}</span></div>
                      </div>
                    </>
                  );

                  return unlocked ? (
                    <Link href={`/room/${room.slug}`} className="room-card" key={room.slug}>{card}</Link>
                  ) : (
                    <div className="room-card room-card-locked" key={room.slug}>{card}</div>
                  );
                })}
              </div>
            </section>
          );
        })}

        <section className="coverage-note">
          <strong>Linux Basics baseline:</strong> navigation, file operations, text reading, grep/find search, symbolic and numeric permissions,
          process inspection, pipes/redirection, and user/system context are all included before the cybersecurity rooms unlock.
        </section>
        <div className="small" style={{ paddingBottom: 36 }}>{completedRooms}/{rooms.length} rooms completed.</div>
      </main>
      <footer className="footer-note">Training simulator only · no commands are executed on the web server or your device shell.</footer>
    </div>
  );
}
