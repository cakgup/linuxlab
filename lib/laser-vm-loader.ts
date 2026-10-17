import type { LaserState } from "./laser-shell";
import { executeLaser } from "./laser-shell";

const blobs = new Map<string, Promise<string>>();

async function loadOriginal(blob: string, binary: boolean, expectedHash: string): Promise<string> {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const response = await fetch(`${base}/ctf/linux-vm/${blob}`);
  if (!response.ok) throw new Error("Berkas latihan tidak dapat dimuat. Periksa koneksi dan coba lagi.");
  const packed = new Uint8Array(await response.arrayBuffer());
  const bytes = packed[0] === 0x1f && packed[1] === 0x8b
    ? new Uint8Array(await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer())
    : packed;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const hash = Array.from(digest, b => b.toString(16).padStart(2, "0")).join("");
  if (hash !== expectedHash) throw new Error("Checksum berkas latihan tidak cocok. Muat ulang halaman untuk mencoba lagi.");
  if (!binary) return new TextDecoder().decode(bytes);
  let text = "";
  for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return text;
}

export async function executeLaserWithOriginalFiles(state: LaserState, line: string) {
  let input = state;
  while (true) {
    const result = executeLaser(input, line);
    if (!result.needsFile) return result;
    const node = input.fs[result.needsFile];
    if (!node?.blob || !node.digests?.sha256sum) throw new Error("Referensi berkas latihan tidak tersedia.");
    if (!blobs.has(node.blob)) {
      const pending = loadOriginal(node.blob, !!node.binary, node.digests.sha256sum).catch(error => { blobs.delete(node.blob!); throw error; });
      blobs.set(node.blob, pending);
    }
    const content = await blobs.get(node.blob)!;
    input = { ...input, fs: { ...input.fs, [node.path]: { ...node, content } } };
  }
}
