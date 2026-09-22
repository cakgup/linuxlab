"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Award, Check, ChevronLeft, ChevronRight, Circle, Lightbulb, Lock, RotateCcw, Target, Trophy } from "lucide-react";
import { RoomDefinition } from "@/lib/types";
import { createInitialState } from "@/lib/fs";
import { executeLine } from "@/lib/shell";
import { isTaskComplete } from "@/lib/validator";
import { readProgress, writeProgress } from "@/lib/progress";
import { getRoom, isRoomComplete, isRoomUnlocked, rooms } from "@/lib/tracks";
import { BrowserTerminal, TerminalCommandResponse } from "./BrowserTerminal";
import { Nav } from "./Nav";
import { RoomIcon } from "./RoomIcon";

export function RoomClient({ room }: { room: RoomDefinition }) {
  const [labState, setLabState] = useState(() => createInitialState());
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

  const checkProgress = (nextState: ReturnType<typeof createInitialState>) => {
    const newlyDone = room.tasks.filter((task) => !completed.includes(task.id) && isTaskComplete(task, nextState));
    if (!newlyDone.length) return;
    const ids = Array.from(new Set([...completed, ...newlyDone.map((t) => t.id)]));
    setCompleted(ids);
    writeProgress({ completedTaskIds: ids });
    setJustCompleted(newlyDone[newlyDone.length - 1].id);
    window.setTimeout(() => setJustCompleted(null), 2200);
  };

  const handleCommand = (line: string): TerminalCommandResponse => {
    const result = executeLine(labState, line);
    setLabState(result.state);
    checkProgress(result.state);
    return { output: result.output, cwd: result.state.cwd, clear: result.clear };
  };

  const resetLab = () => {
    setLabState(createInitialState());
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
        <main className="container locked-room-page"><div className="small">Loading learning progress…</div></main>
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
            <div className="eyebrow">Room locked</div>
            <h1>{room.title}</h1>
            <p>Complete the required room{prerequisites.length === 1 ? "" : "s"} before entering this lab.</p>
            <div className="prerequisite-list">
              {prerequisites.map((prereq) => (
                <div key={prereq.slug}>
                  <Circle size={15} />
                  <span>{prereq.title}</span>
                  <strong>{isRoomComplete(prereq, completed) ? "Complete" : "Required"}</strong>
                </div>
              ))}
            </div>
            <div className="hero-actions">
              <Link className="btn btn-primary" href={prerequisites[0] ? `/room/${prerequisites[0].slug}` : "/"}>Go to prerequisite <ChevronRight size={16} /></Link>
              <Link className="btn" href="/">Back to learning paths</Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="shell">
      <Nav xp={xp} completed={completed.length} />
      <div className="room-layout">
        <section className="lesson-pane">
          <div className="lesson-inner">
            <div className="breadcrumb"><Link href="/">Learning paths</Link><span>/</span><span>{room.path}</span><span>/</span><span>{room.title}</span></div>
            <div className="lesson-heading">
              <RoomIcon icon={room.icon} />
              <div>
                <div className="eyebrow">{room.subtitle}</div>
                <h1>{room.title}</h1>
                <p>{room.description}</p>
              </div>
            </div>

            <div className="tag-row" style={{ marginTop: 18 }}>
              <span className={`badge badge-${room.difficulty.toLowerCase()}`}>{room.difficulty}</span>
              <span className="tag">{room.duration}</span>
              <span className="tag">{roomDone}/{room.tasks.length} complete</span>
            </div>

            <div className="lesson-card">
              <h3>What you&apos;ll learn</h3>
              <ul>{room.learning.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>

            <div className="task-list">
              {room.tasks.map((task, index) => {
                const done = completed.includes(task.id);
                return (
                  <button key={task.id} className={`task-tab ${index === activeIndex ? "active" : ""} ${done ? "done" : ""}`} onClick={() => { setActiveIndex(index); setShowHint(false); }}>
                    <span><span className="task-number">TASK {index + 1}</span>{task.title}</span>
                    {done ? <Check size={17} /> : <Circle size={15} />}
                  </button>
                );
              })}
            </div>

            <div className="lesson-card objective">
              <h3><Target size={17} style={{ verticalAlign: "-3px", marginRight: 7 }} />Mission context</h3>
              <p>{activeTask.context}</p>
              <div className="question">Objective: {activeTask.objective}</div>
              <div className="small">Reward: +{activeTask.xp} XP · Validation checks command history, filesystem state, permissions, or simulated processes.</div>
            </div>

            {completed.includes(activeTask.id) && (
              <div className="lesson-card success">
                <h3><Trophy size={17} style={{ verticalAlign: "-3px", marginRight: 7 }} />Task completed</h3>
                <p>This objective has been validated. Continue exploring or move to the next task.</p>
              </div>
            )}

            {room.badge && room.tasks.every((t) => completed.includes(t.id)) && (
              <div className="lesson-card badge-award">
                <h3><Award size={17} style={{ verticalAlign: "-3px", marginRight: 7 }} />Badge unlocked: {room.badge}</h3>
                <p>You completed every objective in this milestone room.</p>
              </div>
            )}

            {showHint && (
              <div className="lesson-card hint"><h3><Lightbulb size={17} style={{ verticalAlign: "-3px", marginRight: 7 }} />Hint</h3><p>{activeTask.hint}</p></div>
            )}

            <div className="hero-actions" style={{ marginTop: 16 }}>
              <button className="btn" onClick={() => setShowHint((v) => !v)}><Lightbulb size={16} /> {showHint ? "Hide hint" : "Show hint"}</button>
              {activeIndex > 0 && <button className="btn" onClick={() => { setActiveIndex((i) => i - 1); setShowHint(false); }}><ChevronLeft size={16} /> Previous task</button>}
              {activeIndex < room.tasks.length - 1 && <button className="btn btn-primary" onClick={() => { setActiveIndex((i) => i + 1); setShowHint(false); }}>Next task <ChevronRight size={16} /></button>}
              {activeIndex === room.tasks.length - 1 && nextRoom && room.tasks.every((t) => completed.includes(t.id)) && <Link className="btn btn-primary" href={`/room/${nextRoom.slug}`}>Unlock next room <ChevronRight size={16} /></Link>}
            </div>

            {previousRoom && <div className="small room-sequence-note">Previous room: {previousRoom.title} · Next: {nextRoom?.title || "Learning path complete"}</div>}
          </div>
        </section>

        <section className="terminal-pane">
          <div className="terminal-toolbar">
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}><span className="terminal-dots"><i /><i /><i /></span><span>training-web-01 · isolated simulator</span></div>
            <div className="terminal-actions"><button onClick={resetLab}><RotateCcw size={12} style={{ verticalAlign: "-2px", marginRight: 5 }} />Reset lab</button></div>
          </div>
          <div className="terminal-wrap"><BrowserTerminal onCommand={handleCommand} cwd={labState.cwd} resetToken={resetToken} /></div>
          {justCompleted && <div className="objective-toast">✓ Objective validated · XP awarded</div>}
        </section>
      </div>
    </div>
  );
}
