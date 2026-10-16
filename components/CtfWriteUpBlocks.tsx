import { Fragment, type ReactNode } from "react";

export type WriteUpBlock =
  | { kind: "paragraph" | "note" | "heading"; text: string }
  | { kind: "step"; text: string; number: string }
  | { kind: "code"; text: string; language: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "table"; headers: string[]; rows: string[][] };

function Inline({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const tokens = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)]+\)|\*[^*]+\*)/g;
  let start = 0;
  for (const match of text.matchAll(tokens)) {
    if (match.index > start) parts.push(text.slice(start, match.index));
    const token = match[0];
    const key = match.index;
    if (token.startsWith("`")) parts.push(<code key={key}>{token.slice(1, -1)}</code>);
    else if (token.startsWith("**")) parts.push(<strong key={key}><Inline text={token.slice(2, -2)} /></strong>);
    else if (token.startsWith("*")) parts.push(<em key={key}><Inline text={token.slice(1, -1)} /></em>);
    else {
      const link = /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/.exec(token)!;
      parts.push(<a key={key} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a>);
    }
    start = match.index + token.length;
  }
  parts.push(text.slice(start));
  return <>{parts.map((part, index) => <Fragment key={index}>{part}</Fragment>)}</>;
}

export function CtfWriteUpBlocks({ blocks }: { blocks: WriteUpBlock[] }) {
  return <>{blocks.map((block, index) => {
    switch (block.kind) {
      case "code": {
        const label = { bash: "Terminal Bash", python: "Python", text: "Hasil / petunjuk", json: "Data JSON", vb: "Kode VBA", http: "HTTP" }[block.language] || block.language || "Perintah / hasil";
        return <div className="writeup-code" key={index}><span>{label}</span><pre><code>{block.text}</code></pre></div>;
      }
      case "table":
        return <div className="writeup-table" key={index}><table><thead><tr>{block.headers.map((header, i) => <th scope="col" key={i}><Inline text={header} /></th>)}</tr></thead><tbody>{block.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}><Inline text={cell} /></td>)}</tr>)}</tbody></table></div>;
      case "step":
        return <h4 className="writeup-step" key={index}><span>{block.number}</span><Inline text={block.text} /></h4>;
      case "heading":
        return <h4 key={index}><Inline text={block.text} /></h4>;
      case "note":
        return <aside className="writeup-note" key={index}><Inline text={block.text} /></aside>;
      case "list": {
        const List = block.ordered ? "ol" : "ul";
        return <List key={index}>{block.items.map((item, i) => <li key={i}><Inline text={item} /></li>)}</List>;
      }
      default:
        return <p key={index}><Inline text={block.text} /></p>;
    }
  })}</>;
}
