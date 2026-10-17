import type { LabState,VNode } from "./types";
import { createInitialState,normalizePath } from "./fs";
import { extractRedirection,runStage,splitPipeline,tokenize,writeFile } from "./shell";
import { sha256 } from "./sha256";

export const forensicCommands="sha256sum strings xxd base64 jq tshark exiftool pdfinfo pdftotext pdfsig gpg steghide readelf objdump sqlite3 7z memory ./evidence/agent".split(" ");
const root="/home/analyst/forensics";
const events=[
  {timestamp:"2026-07-14T01:00:00Z",event:"Login",user:"operator",src_ip:"10.0.0.10",dst_ip:"10.0.0.20",pid:4100},
  {timestamp:"2026-07-14T01:03:00Z",event:"NetworkConnect",user:"operator",src_ip:"10.0.0.20",dst_ip:"192.0.2.44",pid:4200},
  {timestamp:"2026-07-14T01:04:00Z",event:"ProcessCreate",user:"operator",image:"powershell.exe",parent:"winword.exe",pid:4200},
  {timestamp:"2026-07-14T01:05:00Z",event:"TaskCreated",user:"operator",task:"Updater",image:"agent.exe",pid:4200},
];
const packets=[
  {"frame.time_epoch":"1783990920","ip.src":"10.0.0.10","ip.dst":"10.0.0.20","tcp.dstport":"80","http.host":"intranet.invalid","http.request.uri":"/status","http.request.method":"GET"},
  {"frame.time_epoch":"1783990980","ip.src":"10.0.0.20","ip.dst":"192.0.2.44","tcp.dstport":"80","http.host":"lab.control.invalid","http.request.uri":"/assets/banner.jpg","http.request.method":"GET"},
];
const mail="From: Security Training <briefing@lab.control.invalid>\nReply-To: help@other.invalid\nDate: Tue, 14 Jul 2026 08:02:00 +0700\nSubject: Tinjau dokumen latihan\nReceived: from mail.lab.control.invalid by mx.training.invalid\n\nTinjau lampiran secara offline; jangan membuka URL.\n";
const pdf="%PDF-1.4\nLAPORAN LATIHAN\nPersetujuan perlu diverifikasi terhadap audit trail.\n%%EOF\nAPPENDED_NOTE: REVIEW_REQUIRED\n";
const memory="LAB_MEMORY_MODEL\nPID=4100 PPID=900 NAME=winword.exe\nPID=4200 PPID=4100 NAME=powershell.exe\nPID=4300 PPID=4200 NAME=agent.exe\nCOMMAND_LINE=powershell.exe -enc VwByAGkAdABlAC0ATwB1AHQAcAB1AHQAIABSAEUAVgBJAEUAVwBfAFIARQBRAFUASQBSAEUARAA=\nREMOTE=192.0.2.44:80 PID=4300\n";
const agent="\u007fELF LAB_MODEL x86-64\nusage: agent --disarm DOMAIN:KEY\nlab.control.invalid\nstrcmp\nRECOVERY_RECEIPT\n";
const diaryXml='<w:document><w:body><w:p><w:r><w:t>Catatan latihan: cocokkan transaksi dan waktu; pisahkan fakta dari dugaan.</w:t></w:r></w:p></w:body></w:document>';
const archiveEntry=(content:string)=>({content,mode:0o644});
const documentArchive:NonNullable<VNode["archive"]>={kind:"zip",entries:{"word/document.xml":archiveEntry(diaryXml)}};

export function createForensicsState():LabState {
  const state=createInitialState();state.cwd=root;
  const put=(relative:string,content?:string,extra:Partial<VNode>={})=>{
    const path=normalizePath(relative,root);
    const parts=path.split("/").filter(Boolean);
    for(let i=1;i<parts.length;i++){const dir="/"+parts.slice(0,i).join("/");state.fs[dir] ||= {type:"dir",path:dir,name:parts[i-1],mode:0o755,owner:"analyst",group:"analyst"};}
    state.fs[path]={type:content===undefined ? "dir" : "file",path,name:parts[parts.length-1],mode:content===undefined ? 0o755 : 0o644,owner:"analyst",group:"analyst",content,...extra};
  };
  put("work");put("README.txt","Bukti mini sintetis, berbeda dari jawaban Jejak Digital. Semua alat forensik dimodelkan; tidak mengeksekusi program, jaringan, GPG, atau Volatility nyata.\nFolder evidence adalah sumber; keluaran analisis disimpan di work.\nKunci PGP latihan: evidence/training-key.asc. Steganografi: LAB-STEG. Arsip pemulihan: LAB-RECOVERY.\nmemory adalah alat bantu pedagogis, BUKAN perintah Linux/Volatility. Baca materi untuk alur alat nyata.\n");
  put("evidence/mail.enc","LAB_PGP_ENCRYPTED_MAIL",{binary:true});put("evidence/training-key.asc","-----BEGIN PGP PRIVATE KEY BLOCK-----\nTRAINING_MODEL_ONLY\n");
  put("evidence/events.json",JSON.stringify(events,null,2)+"\n");
  put("evidence/transfers.csv","timestamp,tx_id,sender,receiver,amount\n2026-07-14T01:06:00Z,T001,A100,A200,100\n2026-07-14T01:07:00Z,T002,A200,A900,25000\n");
  put("evidence/network.pcap","LAB_PCAP_MODEL",{binary:true});put("evidence/banner.jpg","LAB_JPEG_STEG_MODEL",{binary:true});put("evidence/approval.pdf",pdf,{binary:true});
  put("evidence/console.txt","whoami\nInvoke-WebRequest http://192.0.2.44/assets/banner.jpg -OutFile banner.jpg\nTaskCreated Updater agent.exe\nGet-FileHash approval.pdf\n# Petunjuk analisis stego latihan: LAB-STEG\n");
  put("evidence/capture.raw",memory,{binary:true});put("evidence/agent",agent,{binary:true,mode:0o755});
  put("evidence/workstation.zip","LAB_WORKSTATION_ZIP",{binary:true,archive:{kind:"zip",entries:{"browser/places.sqlite":archiveEntry("LAB_SQLITE_HISTORY"),"history/console.txt":archiveEntry("2026-07-14T01:03:00Z download banner.jpg\n2026-07-14T01:08:00Z create recovery.zip\n2026-07-14T01:09:00Z remove diary.docx\n"),"recovery.zip":archiveEntry("LAB_ENCRYPTED_RECOVERY")}}});
  put("evidence/timeline.csv","2026-07-14T01:07:00Z,transfers.csv,T002,A200->A900\n2026-07-14T01:03:00Z,events.json,NetworkConnect,192.0.2.44\n2026-07-14T01:04:00Z,events.json,ProcessCreate,powershell.exe\n");
  return state;
}

function forensicStage(state:LabState,stage:string,stdin:string):string|undefined {
  const [command,...args]=tokenize(stage);const get=(raw?:string)=>raw ? state.fs[normalizePath(raw,state.cwd)] : undefined;
  const value=(option:string)=>args[args.indexOf(option)+1];
  const source=command==="gpg" ? value(args.includes("--import") ? "--import" : "--decrypt") : args.find(arg=>get(arg)?.type==="file");const node=get(source);const data=node?.content || "";
  const save=(file:string,text:string)=>{const error=writeFile(state,file,text);if(error)throw Error(error);};
  if(command==="sha256sum"){
    if(args[0]==="-c"){
      const list=get(args[1]);if(!list)throw Error("sha256sum: manifest tidak ditemukan");
      return (list.content || "").trim().split("\n").map(line=>{const match=line.match(/^([a-f0-9]{64})\s+\*?(.+)$/);if(!match)return "sha256sum: format manifest salah";const target=get(match[2]);return `${match[2]}: ${target && sha256(target.content || "")===match[1] ? "OK" : "FAILED"}`;}).join("\n");
    }
    return args.map(file=>{const target=get(file);if(!target || target.type!=="file")throw Error(`sha256sum: ${file}: berkas tidak ditemukan`);return `${sha256(target.content || "")}  ${file}`;}).join("\n");
  }
  if(command==="strings"){
    if(!node)throw Error("strings: tentukan berkas");
    const text=args.includes("l") && args.includes("-e") ? data.replace(/\u0000/g,"") : data;
    const minimum=args.includes("-n") ? Number(value("-n")) : 4;
    return (text.match(new RegExp(`[\\x20-\\x7e]{${Math.max(1,minimum)},}`,"g")) || []).join("\n");
  }
  if(command==="xxd"){
    if(!node)throw Error("xxd: tentukan berkas");
    const bytes=new TextEncoder().encode(data).slice(0,args.includes("-l") ? Number(value("-l")) : 64);
    return Array.from({length:Math.ceil(bytes.length/16)},(_,i)=>`${(i*16).toString(16).padStart(8,"0")}: ${Array.from(bytes.slice(i*16,i*16+16),b=>b.toString(16).padStart(2,"0")).join(" ")}`).join("\n");
  }
  if(command==="base64"){
    const text=node ? data : stdin;
    if(args.includes("-d") || args.includes("--decode")){try{return new TextDecoder().decode(Uint8Array.from(atob(text.trim()),c=>c.charCodeAt(0)));}catch{throw Error("base64: invalid input");}}
    return btoa(Array.from(new TextEncoder().encode(text),b=>String.fromCharCode(b)).join(""));
  }
  if(command==="gpg"){
    if(args.includes("--import")){if(!data.startsWith("-----BEGIN PGP PRIVATE KEY"))throw Error("gpg: kunci latihan tidak ditemukan");state.env={...state.env,LAB_PGP_IMPORTED:"yes"};return "gpg: kunci latihan diimpor ke keyring simulasi sesi ini";}
    if(!args.includes("--decrypt") || data!=="LAB_PGP_ENCRYPTED_MAIL")throw Error("gpg: gunakan --import KEY atau --output FILE --decrypt MAIL");
    if(state.env?.LAB_PGP_IMPORTED!=="yes")throw Error("gpg: decryption failed: No secret key; impor kunci latihan dahulu");
    if(args.includes("--output")){save(value("--output"),mail);return "gpg: pesan latihan didekripsi";}return mail;
  }
  if(command==="jq"){
    let parsed:unknown;try{parsed=JSON.parse(node ? data : stdin);}catch{throw Error("jq: JSON tidak valid atau sumber tidak ditemukan");}
    const query=args.find(a=>a!==source && !a.startsWith("-")) || ".";
    let result:unknown[];
    if(query===".")result=[parsed];
    else if(query==="length")result=[Array.isArray(parsed) ? parsed.length : Object.keys(parsed as object).length];
    else {
      if(!Array.isArray(parsed))throw Error("jq: query .[] memerlukan array");
      let rows=parsed as Record<string,unknown>[];
      const select=query.match(/^\.\[\] \| select\(\.(\w+) == "([^"]*)"\)(?: \| \.(\w+))?$/);
      const field=query.match(/^\.\[\]\.(\w+)$/);
      if(select){rows=rows.filter(row=>String(row[select[1]])===select[2]);result=select[3] ? rows.map(row=>row[select[3]]) : rows;}
      else if(field)result=rows.map(row=>row[field[1]]);
      else throw Error('jq: subset latihan: ., length, .[].field, .[] | select(.field == "value") | .field');
    }
    return result.map(item=>args.includes("-r") && typeof item==="string" ? item : JSON.stringify(item,null,2)).join("\n");
  }
  if(command==="tshark"){
    if(!args.includes("-r") || get(value("-r"))?.content!=="LAB_PCAP_MODEL")throw Error("tshark: pilih PCAP latihan dengan -r");
    let selected=packets;const filter=args.includes("-Y") ? value("-Y") : "";
    if(filter==="http")selected=packets.filter(p=>p["http.request.method"]);
    else if(filter){const match=filter.match(/^(ip\.addr|ip\.src|ip\.dst) == ([\d.]+)$/);if(!match)throw Error("tshark: filter latihan: http atau ip.addr == IP");selected=packets.filter(p=>match[1]==="ip.addr" ? p["ip.src"]===match[2] || p["ip.dst"]===match[2] : p[match[1] as "ip.src"|"ip.dst"]===match[2]);}
    const fields=args.flatMap((arg,i)=>arg==="-e" ? [args[i+1]] : []);
    if(fields.some(field=>!(field in packets[0])))throw Error("tshark: field latihan tidak dikenal");
    return selected.map(p=>fields.length ? fields.map(f=>p[f as keyof typeof p]).join("\t") : `${p["frame.time_epoch"]} ${p["ip.src"]} -> ${p["ip.dst"]} HTTP ${p["http.host"]}${p["http.request.uri"]}`).join("\n");
  }
  if(command==="exiftool"){
    if(!node || !["LAB_JPEG_STEG_MODEL",pdf].includes(data))throw Error("exiftool: pilih banner.jpg atau approval.pdf latihan");
    return data===pdf ? "File Type : PDF\nCreator : Lab Editor\nCreate Date : 2026:07:14 01:00:00+00:00\nModify Date : 2026:07:14 01:10:00+00:00" : "File Type : JPEG\nComment : Petunjuk di console.txt, bukan password yang ditebak\nDate/Time Original : 2026:07:14 01:03:00+00:00";
  }
  if(["pdfinfo","pdftotext","pdfsig"].includes(command)){
    if(data!==pdf)throw Error(`${command}: pilih approval.pdf latihan`);
    if(command==="pdfinfo")return "Title: Laporan Latihan\nCreator: Lab Editor\nPages: 1\nEncrypted: no\nPDF version: 1.4";
    if(command==="pdfsig")return "File latihan tidak memiliki tanda tangan digital. Gambar tanda tangan bukan signature kriptografis.";
    const text="LAPORAN LATIHAN\nPersetujuan perlu diverifikasi terhadap audit trail.\n";
    const output=args[args.indexOf(source!)+1];if(output && output!=="-"){save(output,text);return "";}return text;
  }
  if(command==="steghide"){
    if(args[0]!=="extract" || get(value("-sf"))?.content!=="LAB_JPEG_STEG_MODEL")throw Error("steghide: gunakan extract -sf IMAGE -p PASSPHRASE -xf OUTPUT");
    if(value("-p")!=="LAB-STEG")throw Error("steghide: could not extract any data with that passphrase");
    if(!args.includes("-xf"))throw Error("steghide: tentukan -xf work/payload.txt");
    save(value("-xf"),"REVIEW_REQUIRED\nPetunjuk silang: approval.pdf memiliki data setelah EOF.\n");return "wrote extracted training data";
  }
  if(command==="memory"){
    if(!data.startsWith("LAB_MEMORY_MODEL"))throw Error("memory: pilih evidence/capture.raw");
    if(args[0]==="pslist")return data.split("\n").filter(line=>line.startsWith("PID=")).join("\n");
    if(args[0]==="cmdline")return data.split("\n").filter(line=>line.startsWith("COMMAND_LINE=")).join("\n");
    if(args[0]==="netscan")return data.split("\n").filter(line=>line.startsWith("REMOTE=")).join("\n");
    throw Error("memory: helper lab: pslist, cmdline, netscan; bukan Volatility nyata");
  }
  if(command==="readelf" || command==="objdump"){
    if(data!==agent)throw Error(`${command}: pilih evidence/agent model ELF`);
    return command==="readelf" ? "ELF Header (model):\n  Class: ELF64\n  Machine: Advanced Micro Devices X86-64\n  Entry point address: 0x401000" : "Disassembly (model instruksional, bukan binary nyata):\n401000: load expected_key, \"LAB-KEY-42\"\n401010: call strcmp\n401020: jne reject\n401030: emit RECOVERY_RECEIPT\n";
  }
  if(command?.startsWith("./") && get(command)?.content===agent){
    if(args[0]!=="--disarm" || args[1]!=="lab.control.invalid:LAB-KEY-42")throw Error("agent simulator: verifikasi gagal; gabungkan domain dan kunci dari analisis statis");
    return "RECOVERY_RECEIPT: TRAINING-DISARMED\nHanya model lab; tidak ada transaksi atau program nyata yang dijalankan.";
  }
  if(command==="sqlite3"){
    if(data!=="LAB_SQLITE_HISTORY")throw Error("sqlite3: buka places.sqlite hasil ekstraksi workstation");
    const query=args[args.indexOf(source!)+1]?.trim();
    if(query===".tables")return "moz_places moz_historyvisits";
    if(/^select url,title from moz_places;?$/i.test(query || ""))return "http://lab.control.invalid/assets/banner.jpg|Banner\nhttps://intranet.invalid/|Portal internal";
    if(/^select datetime\(visit_date\/1000000,'unixepoch'\) from moz_historyvisits;?$/i.test(query || ""))return "2026-07-14 01:03:00\n2026-07-14 01:00:00";
    throw Error("sqlite3: subset .tables; SELECT url,title FROM moz_places; SELECT datetime(visit_date/1000000,'unixepoch') FROM moz_historyvisits;");
  }
  if(command==="7z" || command==="unzip"){
    if(data==="LAB_ENCRYPTED_RECOVERY"){
      if(command!=="7z" || args[0]!=="x" || !args.includes("-pLAB-RECOVERY"))throw Error("7z: arsip terenkripsi; gunakan password latihan dari README, bukan bypass enkripsi");
      const dest=args.find(a=>a.startsWith("-o"))?.slice(2);if(!dest || get(dest)?.type!=="dir")throw Error("7z: buat direktori tujuan dan tentukan -oDIR");
      const output=normalizePath("diary.docx",normalizePath(dest,state.cwd));save(output,"LAB_DOCX_ZIP");state.fs[output].archive=structuredClone(documentArchive);return "Everything is Ok (model arsip terenkripsi)";
    }
    if(command==="unzip" && args.includes("-p")){
      const entry=args[args.indexOf(source!)+1];const archived=node?.archive?.entries[entry];if(!archived)throw Error("unzip: entri tidak ditemukan");return archived.content;
    }
    if(command==="7z"){
      if(!node?.archive)throw Error("7z: arsip latihan tidak ditemukan");
      if(args[0]==="l")return Object.keys(node.archive.entries).join("\n");
      if(args[0]!=="x")throw Error("7z: gunakan l atau x");
      const dest=args.find(a=>a.startsWith("-o"))?.slice(2);if(!dest)throw Error("7z: tentukan -oDIR");
      const result=runStage(state,`unzip ${source} -d ${dest}`);return result.output;
    }
    return undefined;
  }
  if(command==="file" && node){
    const format=data===agent ? "ELF 64-bit x86-64 executable" : data===pdf ? "PDF document" : data==="LAB_PCAP_MODEL" ? "PCAP capture" : data==="LAB_JPEG_STEG_MODEL" ? "JPEG image" : data==="LAB_SQLITE_HISTORY" ? "SQLite database" : data.startsWith("LAB_MEMORY_MODEL") ? "memory capture" : "";
    if(format)return `${source}: ${format} (model latihan sintetis)`;
  }
  return undefined;
}

export function executeForensics(input:LabState,line:string) {
  let state:LabState={...input,fs:Object.fromEntries(Object.entries(input.fs).map(([path,node])=>[path,{...node}])),env:{...input.env},history:[...input.history],killedPids:[...input.killedPids],processes:input.processes.map(p=>({...p}))};
  if(!line.trim())return {state,output:""};
  state.history.push(line);const redirect=extractRedirection(line);let output="",clear=false;
  try{
    for(const stage of splitPipeline(redirect?.command || line)){
      const [cmd,...args]=tokenize(stage);
      if(cmd==="help"){output="Forensik Linux · bukti mini sintetis, bukan jawaban CTF.\n"+forensicCommands.join(", ")+"\nBaca README.txt dan materi modul. Perintah memory adalah helper pedagogis, bukan Volatility.\nGunakan work/ untuk keluaran; semua program dan format binary di sini dimodelkan.";continue;}
      const result=forensicStage(state,stage,output);
      if(result!==undefined)output=result;
      else {const fallback=runStage(state,stage,output);state=fallback.state;output=fallback.output;clear ||= !!fallback.clear;}
    }
    if(redirect)output=writeFile(state,redirect.file,output+(output && !output.endsWith("\n") ? "\n" : ""),redirect.append);
    return {state,output,clear};
  }catch(error){
    // Failed tool invocations must not satisfy history-based learning objectives.
    state.history.pop();return {state,output:error instanceof Error ? error.message : "Alat forensik gagal"};
  }
}
