export interface TerminalInput { text: string; cursor: number }
export type InputAction = "left" | "right" | "home" | "end" | "backspace" | "delete";

export function editTerminalInput(input: TerminalInput, action: InputAction | { insert: string }): TerminalInput {
  const chars = Array.from(input.text);
  let cursor = Math.max(0, Math.min(input.cursor, chars.length));
  if (typeof action === "object") {
    const inserted = Array.from(action.insert);
    chars.splice(cursor, 0, ...inserted);
    cursor += inserted.length;
  } else if (action === "left") cursor = Math.max(0, cursor - 1);
  else if (action === "right") cursor = Math.min(chars.length, cursor + 1);
  else if (action === "home") cursor = 0;
  else if (action === "end") cursor = chars.length;
  else if (action === "backspace" && cursor > 0) chars.splice(--cursor, 1);
  else if (action === "delete") chars.splice(cursor, 1);
  return { text: chars.join(""), cursor };
}

export function terminalTextWidth(text: string): number {
  let width = 0;
  for (const char of text.replace(/\x1b\[[0-9;]*m/g, "")) {
    if (/\p{Mark}/u.test(char) || char === "\u200d") continue;
    const cp = char.codePointAt(0)!;
    const wide = cp >= 0x1100 && (cp <= 0x115f || cp === 0x2329 || cp === 0x232a ||
      (cp >= 0x2e80 && cp <= 0xa4cf) || (cp >= 0xac00 && cp <= 0xd7a3) ||
      (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xfe10 && cp <= 0xfe6f) ||
      (cp >= 0xff01 && cp <= 0xff60) || (cp >= 0xffe0 && cp <= 0xffe6) ||
      (cp >= 0x1f300 && cp <= 0x1faff) || cp >= 0x20000);
    width += wide ? 2 : 1;
  }
  return width;
}
