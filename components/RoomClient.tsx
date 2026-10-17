"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Award, Check, ChevronLeft, ChevronRight, Circle, Lightbulb, Lock, RotateCcw, Target, Trophy } from "lucide-react";
import { RoomDefinition } from "@/lib/types";
import { cancelRoomInput,completeRoomCommand,createRoomState,executeRoomCommand,roomIdentity,roomSessionAdvice } from "@/lib/lab-session";
import { isTaskComplete } from "@/lib/validator";
import { readProgress, writeProgress } from "@/lib/progress";
import { difficultyLabels, getRoom, isRoomComplete, isRoomUnlocked, learningPathLabels, rooms } from "@/lib/tracks";
import { BrowserTerminal, TerminalCommandResponse } from "./BrowserTerminal";
import { Nav } from "./Nav";
import { RoomIcon } from "./RoomIcon";
import { CommandLesson } from "./CommandLesson";

export function RoomClient({ room }: { room: RoomDefinition }) {
  const [labState, setLabState] = useState(() => createRoomState(room));
  const [completed, setCompleted] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [justCompleted, setJustCompleted] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCompleted(readProgress().completedTaskIds);
    setLoaded(true);
  }, []);

  const allTasks = useMemo(() => rooms.flatMap((r) => r.tasks), []);
  const xp = allTasks.filter((t) => completed.includes(t.id)).reduce((sum, t) => sum + t.xp, 0);
  const activeTask = room.tasks[activeIndex];
  const roomDone = room.tasks.filter((t) => completed.includes(t.id)).length;
  const unlocked = isRoomUnlocked(room, completed);

  const identity=roomIdentity(room,labState);
  const sessionAdvice=roomSessionAdvice(room,labState);
  const checkProgress = (nextState: ReturnType<typeof createRoomState>) => {
    const newlyDone = room.tasks.filter((task) => !completed.includes(task.id) && isTaskComplete(task, nextState));
    if (!newlyDone.length) return;
    const ids = Array.from(new Set([...completed, ...newlyDone.map((t) => t.id)]));
    setCompleted(ids);
    writeProgress({ completedTaskIds: ids });
    setJustCompleted(newlyDone[newlyDone.length - 1].id);
    window.setTimeout(() => setJustCompleted(null), 2200);
  };

  const handleCommand = (line: string): TerminalCommandResponse => {
    const result = executeRoomCommand(room,labState, line);
    setLabState(result.state);
    checkProgress(result.state);
    return { ...result, cwd: result.state.cwd, identity:roomIdentity(room,result.state) };
  };

  const resetLab = () => {
    setLabState(createRoomState(room));
    setResetToken((n) => n + 1);
    setJustCompleted(null);
  };

  const roomIndex = rooms.findIndex((r) => r.slug === room.slug);
  const nextRoom = rooms[roomIndex + 1];
  const previousRoom = rooms[roomIndex - 1];

  if (!loaded) {
    return (
      <div className="shell">
        <Nav xp={0} completed={0} />
        <main className="container locked-room-page"><div className="small">Memuat kemajuan belajar…</div></main>
      </div>
    );
  }

  if (!unlocked) {
    const prerequisites = (room.prerequisites || []).map((slug) => getRoom(slug)).filter(Boolean) as RoomDefinition[];
    return (
      <div className="shell">
        <Nav xp={xp} completed={completed.length} />
        <main className="container locked-room-page">
          <div className="locked-room-card">
            <div className="locked-room-icon"><Lock size={30} /></div>
            <div className="eyebrow">Latihan terkunci</div>
            <h1>{room.title}</h1>
            <p>Selesaikan latihan prasyarat berikut untuk membuka latihan ini.</p>
            <div className="prerequisite-list">
              {prerequisites.map((prereq) => (
                <div key={prereq.slug}>
                  <Circle size={15} />
                  <span>{prereq.title}</span>
                  <strong>{isRoomComplete(prereq, completed) ? "Selesai" : "Wajib diselesaikan"}</strong>
                </div>
              ))}
            </div>
            <div className="hero-actions">
              <Link className="btn btn-primary" href={prerequisites[0] ? `/room/${prerequisites[0].slug}` : "/"}>Buka latihan prasyarat <ChevronRight size={16} /></Link>
              <Link className="btn" href="/">Kembali ke jalur belajar</Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="shell">
      <Nav xp={xp} completed={completed.length} />
      <main className="room-layout" lang="id">
        <section className="lesson-pane" id="lesson">
          <div className="lesson-inner">
            <div className="breadcrumb"><Link href="/">Jalur belajar</Link><span>/</span><span>{learningPathLabels[room.path]}</span><span>/</span><span>{room.title}</span></div>
            <div className="lesson-heading">
              <RoomIcon icon={room.icon} />
              <div>
                <div className="eyebrow">{room.subtitle}</div>
                <h1>{room.title}</h1>
                <p>{room.description}</p>
              </div>
            </div>

            <div className="tag-row" style={{ marginTop: 18 }}>
              <span className={`badge badge-${room.difficulty.toLowerCase()}`}>{difficultyLabels[room.difficulty]}</span>
              <span className="tag">{room.duration}</span>
              <span className="tag">{roomDone}/{room.tasks.length} selesai</span>
            </div>
            <a className="btn btn-primary mobile-terminal-link" href="#terminal">Buka terminal <ChevronRight size={16} /></a>

            <div className="lesson-card">
              <h3>Yang akan kita pelajari</h3>
              <ul>{room.learning.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>

            <div className="task-list">
              {room.tasks.map((task, index) => {
                const done = completed.includes(task.id);
                return (
                  <button key={task.id} className={`task-tab ${index === activeIndex ? "active" : ""} ${done ? "done" : ""}`} onClick={() => { setActiveIndex(index); setShowHint(false); }}>
                    <span><span className="task-number">TUGAS {index + 1}</span>{task.title}</span>
                    {done ? <Check size={17} /> : <Circle size={15} />}
                  </button>
                );
              })}
            </div>

            <CommandLesson room={room} />

            <div className="lesson-card objective">
              <h3><Target size={17} style={{ verticalAlign: "-3px", marginRight: 7 }} />Latar belakang tugas</h3>
              <p>{activeTask.context}</p>
              <div className="question">Tujuan: {activeTask.objective}</div>
              <div className="small">Poin: +{activeTask.xp} XP · Tugas diperiksa otomatis berdasarkan riwayat perintah, keadaan berkas, izin akses, atau proses dalam simulasi.</div>
            </div>

            {completed.includes(activeTask.id) && (
              <div className="lesson-card success">
                <h3><Trophy size={17} style={{ verticalAlign: "-3px", marginRight: 7 }} />Tugas selesai</h3>
                <p>Tujuan tugas sudah tercapai. Kita dapat melanjutkan percobaan atau beralih ke tugas berikutnya.</p>
              </div>
            )}

            {room.badge && room.tasks.every((t) => completed.includes(t.id)) && (
              <div className="lesson-card badge-award">
                <h3><Award size={17} style={{ verticalAlign: "-3px", marginRight: 7 }} />Lencana diperoleh: {room.badge}</h3>
                <p>Seluruh tugas pada latihan ini sudah selesai.</p>
              </div>
            )}

            {showHint && (
              <div className="lesson-card hint"><h3><Lightbulb size={17} style={{ verticalAlign: "-3px", marginRight: 7 }} />Petunjuk</h3><p>{activeTask.hint}</p></div>
            )}

            <div className="hero-actions" style={{ marginTop: 16 }}>
              <button className="btn" onClick={() => setShowHint((v) => !v)}><Lightbulb size={16} /> {showHint ? "Sembunyikan petunjuk" : "Tampilkan petunjuk"}</button>
              {activeIndex > 0 && <button className="btn" onClick={() => { setActiveIndex((i) => i - 1); setShowHint(false); }}><ChevronLeft size={16} /> Tugas sebelumnya</button>}
              {activeIndex < room.tasks.length - 1 && <button className="btn btn-primary" onClick={() => { setActiveIndex((i) => i + 1); setShowHint(false); }}>Tugas berikutnya <ChevronRight size={16} /></button>}
              {activeIndex === room.tasks.length - 1 && room.tasks.every((t) => completed.includes(t.id)) && <Link className="btn btn-primary" href={nextRoom ? `/room/${nextRoom.slug}` : "/ctf/arena/"}>{nextRoom ? "Buka latihan berikutnya" : "Materi selesai · buka arena CTF"} <ChevronRight size={16} /></Link>}
            </div>

            {previousRoom && <div className="small room-sequence-note">Latihan sebelumnya: {previousRoom.title} · Berikutnya: {nextRoom?.title || "Arena CTF (opsional)"}</div>}
          </div>
        </section>

        <section className="terminal-pane" id="terminal" aria-label="Terminal latihan">
          <div className="terminal-toolbar">
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}><span className="terminal-dots"><i /><i /><i /></span><span>{identity ? `${identity.user}@${identity.host}` : "training-web-01"} · simulasi terisolasi</span></div>
            <div className="terminal-actions"><a className="mobile-terminal-link" href="#lesson">Kembali ke materi</a><button onClick={resetLab}><RotateCcw size={12} style={{ verticalAlign: "-2px", marginRight: 5 }} />Atur ulang latihan</button></div>
          </div>
          {sessionAdvice && <div className="room-session-guide" role="status"><strong>{sessionAdvice.label}</strong><p>{sessionAdvice.message}</p>{sessionAdvice.commands.map(command=><code key={command}>{command}</code>)}<span>Modul administrasi memakai server latihan yang sama dengan Warm Up. SSH: admin1234! · MySQL: baca DB_PASSWORD di wp-config.php. Modul setelah SSH dimulai pada shell server; login MySQL tetap dipraktikkan sendiri.</span></div>}
          <div className="terminal-wrap"><BrowserTerminal onCommand={handleCommand} cwd={labState.cwd} identity={identity} resetToken={resetToken} onComplete={line => completeRoomCommand(room,labState,line)} onCancel={()=>{const next=cancelRoomInput(room,labState);setLabState(next);return {prompt:Reflect.get(next,"mysql") ? "mysql> " : undefined};}} /></div>
          {justCompleted && <div className="objective-toast">✓ Tugas selesai · XP bertambah</div>}
        </section>
      </main>
    </div>
  );
}
