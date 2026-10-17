import Link from "next/link";
import type { RoomDefinition } from "@/lib/types";
import { getCommandReference,originalRoomCommands } from "@/lib/command-reference";

export function CommandLesson({room}:{room:RoomDefinition}) {
  const serverExamples:Record<string,string>={pwd:"pwd",cat:"cat /etc/os-release",ls:"ls /etc/apache2/sites-enabled",grep:"grep DB_ /var/www/wordpress/wp-config.php",head:"head -n 1 /var/log/apache2/access-wordpress.log",wc:"wc -l /etc/passwd",awk:"awk '{print $1}' /var/log/apache2/access-wordpress.log",sort:"awk '{print $1}' /var/log/apache2/access-wordpress.log | sort",uniq:"awk '{print $1}' /var/log/apache2/access-wordpress.log | sort | uniq -c",tee:"echo REVIEWED | tee /root/review.txt"};
  const commands=(room.commands || originalRoomCommands[room.slug] || []).map(getCommandReference).filter(command=>command!==undefined).map(command=>room.environment==="warm-up" && serverExamples[command.name] ? {...command,example:serverExamples[command.name]} : command);
  if(!commands.length)return null;
  return <section className="lesson-card command-guide" aria-label="Materi perintah"><h3>Materi perintah</h3><p className="small">Pahami fungsi dan opsi perintah sebelum mengerjakan tugas. Jalankan contoh pada lingkungan modul ini.</p>{commands.map((command,i)=><details key={command.name} open={i===0}><summary><code>{command.name}</code><span>{command.category}</span></summary><p>{command.summary}</p><div className="small">Sintaks</div><pre>{command.syntax}</pre><div className="small">Contoh latihan</div><pre>{command.example}</pre></details>)}<Link href="/materi/perintah/" className="btn">Cari di referensi perintah</Link></section>;
}
