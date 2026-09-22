"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

export interface TerminalCommandResponse {
  output: string;
  cwd: string;
  clear?: boolean;
}

function promptPath(cwd: string) {
  if (cwd === "/home/analyst") return "~";
  if (cwd.startsWith("/home/analyst/")) return `~${cwd.slice("/home/analyst".length)}`;
  return cwd;
}

function prompt(cwd: string) {
  return `\x1b[38;2;141;252;101manalyst@training-web-01\x1b[0m:\x1b[38;2;76;201;240m${promptPath(cwd)}\x1b[0m$ `;
}

export function BrowserTerminal({ onCommand, cwd, resetToken }: { onCommand: (line: string) => TerminalCommandResponse; cwd: string; resetToken: number }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const commandRef = useRef(onCommand);
  const cwdRef = useRef(cwd);
  const terminalRef = useRef<Terminal | null>(null);
  const bufferRef = useRef("");
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);

  useEffect(() => { commandRef.current = onCommand; }, [onCommand]);
  useEffect(() => { cwdRef.current = cwd; }, [cwd]);

  useEffect(() => {
    if (!hostRef.current) return;
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
      fontSize: 14,
      lineHeight: 1.25,
      scrollback: 2500,
      theme: {
        background: "#06090c",
        foreground: "#d8e1e8",
        cursor: "#8dfc65",
        selectionBackground: "#284053",
        black: "#111820",
        brightBlack: "#60717f",
        green: "#8dfc65",
        brightGreen: "#adff91",
        cyan: "#4cc9f0",
        yellow: "#ffb454",
        red: "#ff6b6b",
      },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(hostRef.current);
    terminalRef.current = term;

    term.writeln("\x1b[1;38;2;141;252;101mLinuxLab Cyber Training Host\x1b[0m");
    term.writeln("Safe browser simulation. Type \x1b[36mhelp\x1b[0m for available commands.\r\n");
    term.write(prompt(cwdRef.current));
    fit.fit();

    const rewriteBuffer = (next: string) => {
      while (bufferRef.current.length > 0) {
        term.write("\b \b");
        bufferRef.current = bufferRef.current.slice(0, -1);
      }
      bufferRef.current = next;
      term.write(next);
    };

    const disposable = term.onData((data: string) => {
      if (data === "\r") {
        const line = bufferRef.current;
        term.write("\r\n");
        if (line.trim()) {
          historyRef.current.push(line);
          historyIndexRef.current = historyRef.current.length;
        }
        const result = commandRef.current(line);
        if (result.clear) term.clear();
        if (result.output) term.writeln(result.output.replace(/\n/g, "\r\n"));
        bufferRef.current = "";
        cwdRef.current = result.cwd;
        term.write(prompt(result.cwd));
        return;
      }

      if (data === "\u007f") {
        if (bufferRef.current.length > 0) {
          bufferRef.current = bufferRef.current.slice(0, -1);
          term.write("\b \b");
        }
        return;
      }

      if (data === "\x03") {
        term.write("^C\r\n");
        bufferRef.current = "";
        term.write(prompt(cwdRef.current));
        return;
      }

      if (data === "\x0c") {
        term.clear();
        term.write(prompt(cwdRef.current) + bufferRef.current);
        return;
      }

      if (data === "\x1b[A") {
        if (!historyRef.current.length) return;
        historyIndexRef.current = Math.max(0, historyIndexRef.current - 1);
        rewriteBuffer(historyRef.current[historyIndexRef.current] || "");
        return;
      }

      if (data === "\x1b[B") {
        if (!historyRef.current.length) return;
        historyIndexRef.current = Math.min(historyRef.current.length, historyIndexRef.current + 1);
        rewriteBuffer(historyIndexRef.current === historyRef.current.length ? "" : historyRef.current[historyIndexRef.current]);
        return;
      }

      if (data.startsWith("\x1b")) return;
      if ([...data].every((ch) => ch >= " ")) {
        bufferRef.current += data;
        term.write(data);
      }
    });

    const resize = () => {
      try { fit.fit(); } catch { /* terminal may be disposing */ }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(hostRef.current);
    window.addEventListener("resize", resize);

    return () => {
      disposable.dispose();
      observer.disconnect();
      window.removeEventListener("resize", resize);
      term.dispose();
      terminalRef.current = null;
    };
  }, []);

  useEffect(() => {
    const term = terminalRef.current;
    if (!term || resetToken === 0) return;
    term.clear();
    bufferRef.current = "";
    historyRef.current = [];
    historyIndexRef.current = -1;
    term.writeln("\x1b[33mLab environment reset.\x1b[0m\r\n");
    term.write(prompt(cwd));
  }, [resetToken, cwd]);

  return <div ref={hostRef} className="terminal-host" aria-label="Linux training terminal" />;
}
