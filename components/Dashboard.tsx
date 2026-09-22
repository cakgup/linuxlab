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
  const nextRoom = rooms.find((room) => isRoomUnlocked(room, completed) && !isRoomComplete(room, completed));

  const reset = () => {
    if (!window.confirm("Hapus seluruh progres belajar dan XP di browser ini?")) return;
    clearProgress();
    setCompleted([]);
  };

  return (
    <div className="shell">
      <Nav xp={earnedXp} completed={completed.length} />
      <header className="hero">
        <div className="container">
          <div className="eyebrow">Linux & Cybersecurity Learning Lab</div>
          <h1>LinuxLab Cyber</h1>
          <p>
            Pelajari Linux dari dasar, praktikkan investigasi keamanan, dan selesaikan tantangan incident response.
            Semua latihan berjalan di browser, tanpa instalasi VM atau akses ke shell perangkat Anda.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" href={`/room/${nextRoom?.slug || rooms[0].slug}`}>{completed.length === 0 ? "Mulai Belajar" : nextRoom ? "Lanjutkan Belajar" : "Ulangi Latihan"} <ArrowRight size={17} /></Link>
            {learningPaths.map((path, index) => <a className="btn" key={path.name} href={`#path-${index + 1}`}>{path.name}</a>)}
          </div>
        </div>
      </header>
      <main className="container dashboard-main" id="main-content">
        <section className="stats">
          <div className="stat"><TerminalSquare size={19} /><strong>{rooms.length}</strong><span>Room interaktif</span></div>
          <div className="stat"><Waypoints size={19} /><strong>{totalTasks}</strong><span>Tugas praktik</span></div>
          <div className="stat"><Trophy size={19} /><strong>{earnedXp}/{totalXp}</strong><span>XP terkumpul</span></div>
          <div className="stat"><Shield size={19} /><strong>{percent}%</strong><span>Progres belajar</span></div>
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
            <section className="learning-path" id={`path-${pathIndex + 1}`} aria-labelledby={`path-title-${pathIndex + 1}`} key={path.name}>
              <div className="section-title path-title">
                <div>
                  <div className="path-kicker">{String(pathIndex + 1).padStart(2, "0")} · {path.accent}</div>
                  <h2 id={`path-title-${pathIndex + 1}`}>{path.name}</h2>
                  <p>{path.description}</p>
                </div>
                <div className="path-progress-summary">
                  <strong>{pathPercent}%</strong>
                  <span>{pathCompleted}/{pathRooms.length} rooms</span>
                </div>
              </div>

              {!pathUnlocked && (
                <div className="path-locked-banner"><Lock size={15} /> Selesaikan jalur sebelumnya untuk membuka latihan ini. Pilih room untuk melihat prasyaratnya.</div>
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
                        {!unlocked ? <span className="lock-chip"><Lock size={12} /> Terkunci</span> : complete ? <span className="complete-chip"><CheckCircle2 size={12} /> Selesai</span> : <span className="complete-chip">Tersedia</span>}
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

                  return (
                    <Link href={`/room/${room.slug}`} className={`room-card ${unlocked ? "" : "room-card-locked"}`} key={room.slug}>{card}<span className="room-card-action">{unlocked ? complete ? "Ulangi latihan" : "Buka latihan" : "Lihat prasyarat"} <ArrowRight size={14} /></span></Link>
                  );
                })}
              </div>
            </section>
          );
        })}

        <section className="coverage-note">
          <strong>Belajar bertahap.</strong> Mulai dari navigasi, file, permission, dan proses sebelum masuk ke investigasi keamanan.
          Materi dan perintah latihan menggunakan bahasa Inggris. Progres tersimpan otomatis di browser ini.
        </section>
        <div className="progress-tools"><span className="small">{completedRooms}/{rooms.length} room selesai.</span>{completed.length > 0 && <button className="btn" onClick={reset}><RotateCcw size={16} /> Reset progres</button>}</div>
      </main>
      <footer className="footer-note">LinuxLab Cyber · Simulasi pembelajaran Linux dan keamanan siber.<br />developed with love by cakgup</footer>
    </div>
  );
}
