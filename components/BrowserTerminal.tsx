"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { editTerminalInput, terminalTextWidth, InputAction } from "@/lib/terminal-input";

export interface TerminalCommandResponse {
  output: string;
  cwd: string;
  clear?: boolean;
  password?: boolean;
  passwordPrompt?: string;
  prompt?: string;
  identity?: { user: string; host: string; home: string };
}

function promptPath(cwd: string) {
  if (cwd === "/home/analyst") return "~";
  if (cwd.startsWith("/home/analyst/")) return `~${cwd.slice("/home/analyst".length)}`;
  return cwd;
}

function prompt(cwd: string, identity?: { user: string; host: string; home: string }) {
  const path = identity ? (cwd === identity.home ? "~" : cwd.startsWith(identity.home + "/") ? "~" + cwd.slice(identity.home.length) : cwd) : promptPath(cwd);
  return `\x1b[38;2;141;252;101m${identity ? `${identity.user}@${identity.host}` : "analyst@training-web-01"}\x1b[0m:\x1b[38;2;76;201;240m${path}\x1b[0m${identity?.user === "root" ? "#" : "$"} `;
}

export function BrowserTerminal({ onCommand, cwd, resetToken, identity, onComplete, onCancel }: { onCommand: (line: string) => TerminalCommandResponse | Promise<TerminalCommandResponse>; cwd: string; resetToken: number; identity?: { user: string; host: string; home: string }; onComplete?: (line: string) => string; onCancel?: () => { prompt?: string } | void }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const commandRef = useRef(onCommand);
  const cwdRef = useRef(cwd);
  const terminalRef = useRef<Terminal | null>(null);
  const bufferRef = useRef("");
  const cursorRef = useRef(0);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const identityRef = useRef(identity);
  const completeRef = useRef(onComplete);
  const cancelRef = useRef(onCancel);
  const passwordRef = useRef(false);
  const passwordPromptRef = useRef("Password: ");
  const inputPromptRef = useRef("");
  const busyRef = useRef(false);

  useEffect(() => { commandRef.current = onCommand; }, [onCommand]);
  useEffect(() => { cwdRef.current = cwd; }, [cwd]);
  useEffect(() => { identityRef.current = identity; }, [identity]);
  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);
  useEffect(() => { cancelRef.current = onCancel; }, [onCancel]);

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

    term.writeln("\x1b[1;38;2;141;252;101mTerminal Latihan LinuxLab Cyber\x1b[0m");
    term.writeln("Simulasi di peramban. Ketik \x1b[36mhelp\x1b[0m untuk melihat perintah yang tersedia.\r\n");
    term.write(prompt(cwdRef.current, identityRef.current));
    fit.fit();

    const currentPrompt = () => inputPromptRef.current || prompt(cwdRef.current, identityRef.current);
    const writePrompt = () => {
      term.textarea?.setAttribute("aria-label", passwordRef.current ? "Password (input disembunyikan)" : "Terminal input");
      term.write(passwordRef.current ? passwordPromptRef.current : currentPrompt());
    };

    const cancelInput = () => {
      term.write("^C\r\n");
      bufferRef.current = "";
      cursorRef.current = 0;
      passwordRef.current = false;
      const cancelled = cancelRef.current?.();
      if (cancelled) inputPromptRef.current = cancelled.prompt || "";
      writePrompt();
    };

    term.attachCustomKeyEventHandler(event => {
      if (passwordRef.current && event.type === "keydown" && event.ctrlKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        cancelInput();
        return false;
      }
      return true;
    });

    const rewriteBuffer = (next: string, cursor = Array.from(next).length) => {
      const promptWidth = terminalTextWidth(currentPrompt());
      const oldPosition = promptWidth + terminalTextWidth(Array.from(bufferRef.current).slice(0, cursorRef.current).join(""));
      if (!passwordRef.current) {
        const oldRow = Math.floor(oldPosition / term.cols);
        term.write("\r" + (oldRow ? `\x1b[${oldRow}A` : "") + "\x1b[J");
        term.write(currentPrompt() + next);
        const end = promptWidth + terminalTextWidth(next);
        // Resolve xterm's pending wrap before positioning the editing cursor.
        if (end > 0 && end % term.cols === 0) term.write("\r\n");
        const position = promptWidth + terminalTextWidth(Array.from(next).slice(0, cursor).join(""));
        const up = Math.floor(end / term.cols) - Math.floor(position / term.cols);
        term.write("\r" + (up ? `\x1b[${up}A` : "") + (position % term.cols ? `\x1b[${position % term.cols}C` : ""));
      }
      bufferRef.current = next;
      cursorRef.current = cursor;
    };
    const edit = (action: InputAction | { insert: string }) => {
      const next = editTerminalInput({ text: bufferRef.current, cursor: cursorRef.current }, action);
      rewriteBuffer(next.text, next.cursor);
    };

    const disposable = term.onData(async (data: string) => {
      if (busyRef.current) return;
      if (data === "\r") {
        const line = bufferRef.current;
        if (!passwordRef.current) rewriteBuffer(line);
        term.write("\r\n");
        if (!passwordRef.current && line.trim()) {
          historyRef.current.push(line);
          historyIndexRef.current = historyRef.current.length;
        }
        busyRef.current = true;
        hostRef.current?.setAttribute("aria-busy", "true");
        let result: TerminalCommandResponse;
        try { result = await commandRef.current(line); }
        catch (error) {
          cancelRef.current?.();
          result = { output: error instanceof Error ? error.message : "Perintah tidak dapat diproses.", cwd: cwdRef.current };
        } finally { busyRef.current = false; hostRef.current?.setAttribute("aria-busy", "false"); }
        if (terminalRef.current !== term) return;
        if (result.clear) term.clear();
        const output = result.output.length > 200000 ? result.output.slice(0, 100000) + "\n[Keluaran terminal dipersingkat. Gunakan head, tail, atau grep untuk membaca bagian yang diperlukan.]\n" + result.output.slice(-100000) : result.output;
        if (output) term.writeln(output.replace(/\n/g, "\r\n"));
        bufferRef.current = "";
        cursorRef.current = 0;
        cwdRef.current = result.cwd;
        if (result.identity) identityRef.current = result.identity;
        passwordRef.current = !!result.password;
        passwordPromptRef.current = result.passwordPrompt || "Password: ";
        inputPromptRef.current = result.prompt || "";
        writePrompt();
        return;
      }

      const actions: Record<string, InputAction> = {
        "\x1b[D": "left", "\x1bOD": "left", "\x1b[C": "right", "\x1bOC": "right",
        "\x1b[H": "home", "\x1bOH": "home", "\x1b[1~": "home", "\x1b[7~": "home", "\x01": "home",
        "\x1b[F": "end", "\x1bOF": "end", "\x1b[4~": "end", "\x1b[8~": "end", "\x05": "end",
        "\u007f": "backspace", "\x08": "backspace", "\x1b[3~": "delete",
      };
      if (actions[data]) {
        edit(actions[data]);
        return;
      }

      if (data === "\t") {
        if (!passwordRef.current && completeRef.current) {
          const chars = Array.from(bufferRef.current);
          const completed = completeRef.current(chars.slice(0, cursorRef.current).join(""));
          rewriteBuffer(completed + chars.slice(cursorRef.current).join(""), Array.from(completed).length);
        }
        return;
      }

      if (data === "\x03") {
        cancelInput();
        return;
      }

      if (data === "\x0c") {
        term.clear();
        const saved = bufferRef.current, cursor = cursorRef.current;
        bufferRef.current = ""; cursorRef.current = 0;
        writePrompt();
        rewriteBuffer(saved, cursor);
        return;
      }

      if (data === "\x1b[A") {
        if (passwordRef.current) return;
        if (!historyRef.current.length) return;
        historyIndexRef.current = Math.max(0, historyIndexRef.current - 1);
        rewriteBuffer(historyRef.current[historyIndexRef.current] || "");
        return;
      }

      if (data === "\x1b[B") {
        if (passwordRef.current) return;
        if (!historyRef.current.length) return;
        historyIndexRef.current = Math.min(historyRef.current.length, historyIndexRef.current + 1);
        rewriteBuffer(historyIndexRef.current === historyRef.current.length ? "" : historyRef.current[historyIndexRef.current]);
        return;
      }

      if (data.startsWith("\x1b")) return;
      if ([...data].every((ch) => ch >= " ")) {
        edit({ insert: data });
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
    cursorRef.current = 0;
    passwordRef.current = false;
    inputPromptRef.current = "";
    cancelRef.current?.();
    term.textarea?.setAttribute("aria-label", "Terminal input");
    historyRef.current = [];
    historyIndexRef.current = -1;
    term.writeln("\x1b[33mLingkungan latihan telah diatur ulang.\x1b[0m\r\n");
    term.write(prompt(cwdRef.current, identityRef.current));
  }, [resetToken]);

  return <div ref={hostRef} className="terminal-host" aria-label="Terminal latihan Linux" />;
}
