import { normalizePath, parentPath } from "./fs";
import { labCommands, shellBuiltins } from "./command-catalog";
import type { LabState, VNode } from "./types";

export function runExtended(state:LabState, command:string, args:string[], stdin:string): {state:LabState;output:string} | undefined {
  if (!"which type file sort uniq cut tr sed awk ln readlink tar zip unzip gzip gunzip df du free lsblk env printenv export date uptime".split(" ").includes(command)) return;
  const done=(output="")=>({state,output});
  const path=(raw:string)=>normalizePath(raw,state.cwd);
  const read=(raw?:string)=>{
    if (!raw) return stdin;
    let node=state.fs[path(raw)];
    for(let i=0;node?.linkTarget && i<8;i++)node=state.fs[normalizePath(node.linkTarget,parentPath(node.path))];
    if (!node || node.type!=="file") throw new Error(`${command}: ${raw}: berkas teks tidak ditemukan`);
    if(node.binary || node.archive)throw new Error(`${command}: ${raw}: bukan berkas teks; buka arsip terlebih dahulu`);
    return node.content || "";
  };
  const lines=(text:string)=>text.replace(/\n$/,"").split("\n").filter((line,i)=>text!=="" || i>0);
  const put=(raw:string,content:string,extra:Partial<VNode>={})=>{
    const target=path(raw);
    if(state.fs[parentPath(target)]?.type!=="dir")throw new Error(`${command}: direktori tujuan tidak ada: ${parentPath(target)}`);
    state.fs[target]={type:"file",path:target,name:target.split("/").pop()!,mode:0o644,owner:state.env?.USER || "analyst",group:state.env?.USER || "analyst",content,...extra};
  };
  const mkdir=(target:string)=>{
    const parts=target.split("/").filter(Boolean);
    for(let i=1;i<=parts.length;i++) {
      const directory="/"+parts.slice(0,i).join("/");
      if(state.fs[directory]?.type==="file")throw new Error(`${command}: bukan direktori: ${directory}`);
      state.fs[directory] ||= {type:"dir",path:directory,name:parts[i-1],mode:0o755,owner:state.env?.USER || "analyst",group:state.env?.USER || "analyst"};
    }
  };
  try {
    if(command==="which" || command==="type") return done(args.map(name=>shellBuiltins.has(name) ? command==="type" ? `${name} is a shell builtin` : `${name}: shell builtin (gunakan type)` : labCommands.includes(name) && state.fs[`/usr/bin/${name}`] ? command==="type" ? `${name} is /usr/bin/${name}` : `/usr/bin/${name}` : `${name}: not found`).join("\n"));
    if(command==="file") return done(args.map(raw=>{
      const node=state.fs[path(raw)];
      return `${raw}: ${!node ? "cannot open (No such file)" : node.linkTarget ? "symbolic link to "+node.linkTarget : node.type==="dir" ? "directory" : node.archive ? node.archive.kind+" archive (simulasi)" : node.content?.startsWith("#!") ? "POSIX shell script, ASCII text executable" : node.binary || node.content?.includes("ELF") ? "ELF executable (simulasi)" : "ASCII text"}`;
    }).join("\n"));
    if(command==="ln") {
      if(args[0]!=="-s" || args.length!==3)return done("Gunakan ln -s TARGET LINK; lab ini melatih symbolic link.");
      if(state.fs[path(args[2])])return done(`ln: ${args[2]}: File exists`);
      put(args[2],"",{linkTarget:args[1]});return done();
    }
    if(command==="readlink")return done(args.map(raw=>state.fs[path(raw)]?.linkTarget || `${raw}: bukan symbolic link`).join("\n"));
    if(command==="sort" || command==="uniq") {
      const source=args.find(arg=>!arg.startsWith("-"));let data=lines(read(source));
      if(command==="sort") {
        data.sort(args.some(a=>a.includes("n") && a.startsWith("-")) ? (a,b)=>Number(a)-Number(b) : (a,b)=>a<b ? -1 : a>b ? 1 : 0);
        if(args.some(a=>a.startsWith("-") && a.includes("r")))data.reverse();
        if(args.some(a=>a.startsWith("-") && a.includes("u")))data=[...new Set(data)];
        return done(data.join("\n"));
      }
      const groups:{line:string;count:number}[]=[];
      for(const line of data) {const last=groups[groups.length-1];if(last?.line===line)last.count++;else groups.push({line,count:1});}
      return done(groups.map(g=>args.includes("-c") ? `${String(g.count).padStart(7)} ${g.line}` : g.line).join("\n"));
    }
    if(command==="cut") {
      let delimiter="\t", fields="",file:string|undefined;
      for(let i=0;i<args.length;i++) {
        if(args[i]==="-d")delimiter=args[++i] || "";
        else if(args[i].startsWith("-d"))delimiter=args[i].slice(2);
        else if(args[i]==="-f")fields=args[++i] || "";
        else if(args[i].startsWith("-f"))fields=args[i].slice(2);
        else if(!args[i].startsWith("-"))file=args[i];
      }
      if(delimiter.length!==1 || !/^\d+(,\d+)*$/.test(fields))return done("Gunakan cut -d: -f1 BERKAS atau cut -d: -f1,3 BERKAS.");
      return done(lines(read(file)).map(line=>fields.split(",").map(f=>line.split(delimiter)[Number(f)-1] || "").join(delimiter)).join("\n"));
    }
    if(command==="tr") {
      const expand=(raw:string)=>raw.replace(/(.)-(.)/g,(_,from:string,to:string)=>Array.from({length:Math.max(0,to.charCodeAt(0)-from.charCodeAt(0)+1)},(_,i)=>String.fromCharCode(from.charCodeAt(0)+i)).join(""));
      if(args[0]==="-d") {const remove=new Set(expand(args[1] || ""));return done([...stdin].filter(ch=>!remove.has(ch)).join(""));}
      const from=expand(args[0] || ""),to=expand(args[1] || "");
      if(!from || !to)return done("Gunakan tr 'a-z' 'A-Z' setelah pipe.");
      return done([...stdin].map(ch=>from.includes(ch) ? to[Math.min(from.indexOf(ch),to.length-1)] : ch).join(""));
    }
    if(command==="sed") {
      if(args[0]==="-n") {
        const range=args[1]?.match(/^(\d+)(?:,(\d+))?p$/);
        if(!range)return done("Gunakan sed -n '1,3p' BERKAS.");
        return done(lines(read(args[2])).slice(Number(range[1])-1,Number(range[2] || range[1])).join("\n"));
      }
      const replace=args[0]?.match(/^s\/([^/]*)\/([^/]*)\/(g?)$/);
      if(!replace)return done("Subset sed: sed -n '1,3p' BERKAS atau sed 's/lama/baru/g' BERKAS.");
      return done(read(args[1]).replace(new RegExp(replace[1],replace[3] ? "g" : ""),replace[2]));
    }
    if(command==="awk") {
      let at=0,delimiter:RegExp|string=/\s+/;
      if(args[0]?.startsWith("-F")) {delimiter=args[0].slice(2) || args[1];at=args[0].length===2 ? 2 : 1;}
      const field=args[at]?.match(/^\{\s*print\s+\$(\d+)\s*\}$/);
      if(!field)return done("Subset awk: awk '{print $1}' BERKAS, atau gunakan pipe.");
      return done(lines(read(args[at+1])).map(line=>Number(field[1])===0 ? line : line.trim().split(delimiter)[Number(field[1])-1] || "").join("\n"));
    }
    if(command==="env" || command==="printenv") {
      const env=state.env || {HOME:"/home/analyst",USER:"analyst",SHELL:"/bin/bash",PATH:"/usr/bin:/bin"};
      return done(command==="printenv" && args.length ? args.map(key=>env[key] || "").join("\n") : Object.entries(env).map(([key,value])=>`${key}=${value}`).join("\n"));
    }
    if(command==="export") {
      if(!args.length)return done(Object.entries(state.env || {}).map(([key,value])=>`declare -x ${key}="${value}"`).join("\n"));
      const assignment=args.join(" ").match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if(!assignment)return done("Gunakan export NAMA=nilai. Contoh: export CASE_ID=IR-001");
      state.env={...state.env,[assignment[1]]:assignment[2]};return done();
    }
    if(command==="date")return done(args.includes("-u") ? new Date().toISOString().replace("T"," ").replace(/\.\d+Z$/," UTC") : new Date().toISOString());
    if(command==="uptime")return done("03:00:00 up 5 days, 2 users, load average: 0.08, 0.04, 0.01 (simulasi)");
    if(command==="df")return done("Filesystem      Size  Used Avail Use% Mounted on\n/dev/vda1        20G  6.0G   13G  32% /\ntmpfs           512M     0  512M   0% /run (simulasi)");
    if(command==="free")return done("              total        used        free      shared  buff/cache   available\nMem:           2048         512         768          16         768        1280\nSwap:          1024           0        1024\n(simulasi, satuan MiB)");
    if(command==="lsblk")return done("NAME   MAJ:MIN RM SIZE RO TYPE MOUNTPOINT\nvda    254:0    0  20G  0 disk\n└─vda1 254:1    0  20G  0 part /\n(simulasi)");
    if(command==="du") {
      const raw=args.find(a=>!a.startsWith("-")) || ".",target=path(raw);
      if(!state.fs[target])return done(`du: ${raw}: No such file or directory`);
      const bytes=Object.values(state.fs).filter(n=>n.path===target || n.path.startsWith(target+"/")).reduce((sum,n)=>sum+(n.type==="dir" ? 4096 : new TextEncoder().encode(n.content || "").length),0);
      return done(`${args.some(a=>a.includes("h")) ? Math.max(1,Math.ceil(bytes/1024))+"K" : Math.max(1,Math.ceil(bytes/1024))}\t${raw}`);
    }
    if(command==="gzip" || command==="gunzip") {
      const raw=args.find(a=>!a.startsWith("-"));if(!raw)return done(`${command}: tentukan nama berkas`);
      const original=state.fs[path(raw)];if(!original || original.type!=="file")return done(`${command}: ${raw}: No such file`);
      if(command==="gzip") {
        if(original.archive)return done("gzip: contoh latihan memakai berkas teks biasa.");
        put(raw+".gz","[gzip simulasi]",{binary:true,archive:{kind:"gzip",entries:{[original.name]:{content:original.content || "",mode:original.mode}}}});
      } else {
        if(original.archive?.kind!=="gzip")return done("gunzip: bukan arsip gzip simulasi");
        const [name,entry]=Object.entries(original.archive.entries)[0];put(normalizePath(name,parentPath(original.path)),entry.content,{mode:entry.mode});
      }
      if(!args.includes("-k"))delete state.fs[original.path];return done();
    }
    if(command==="tar" || command==="zip" || command==="unzip") {
      const f=args.findIndex(a=>a.startsWith("-") && a.includes("f")),c=args.indexOf("-C"),d=args.indexOf("-d");
      const raw=command==="tar" ? args[f+1] : args.find(a=>!a.startsWith("-"));
      if(!raw || (command==="tar" && f<0))return done("Gunakan tar -cf arsip.tar BERKAS, tar -tf arsip.tar, tar -xf arsip.tar -C DIREKTORI, zip arsip.zip BERKAS, atau unzip arsip.zip -d DIREKTORI.");
      const create=command==="zip" || (command==="tar" && args.some(a=>a.startsWith("-") && a.includes("c")));
      if(create) {
        const names=args.filter((a,i)=>!a.startsWith("-") && a!==raw && i!==c+1 && (command!=="tar" || i!==f+1));
        if(!names.length)return done(`${command}: tentukan berkas yang akan diarsipkan`);
        const entries:NonNullable<VNode["archive"]>["entries"]={};
        for(const name of names) {
          const source=state.fs[path(name)];if(!source)throw new Error(`${command}: ${name}: No such file`);
          for(const node of Object.values(state.fs).filter(n=>n.type==="file" && (n.path===source.path || n.path.startsWith(source.path+"/")))) {
            const relative=name.replace(/^\/+/,"").replace(/\/$/,"")+(node.path===source.path ? "" : node.path.slice(source.path.length));
            entries[relative]={content:node.content || "",mode:node.mode};
          }
        }
        put(raw,`[${command} simulasi]`,{binary:true,archive:{kind:command==="zip" ? "zip" : "tar",entries}});return done();
      }
      const archive=state.fs[path(raw)]?.archive;
      if(!archive || archive.kind!==(command==="unzip" ? "zip" : "tar"))return done(`${command}: arsip latihan tidak ditemukan atau format salah`);
      if((command==="tar" && args.some(a=>a.startsWith("-") && a.includes("t"))) || args.includes("-l"))return done(Object.keys(archive.entries).join("\n"));
      const destination=path(c>=0 ? args[c+1] : d>=0 ? args[d+1] : ".");
      if(command==="tar" && !args.some(a=>a.startsWith("-") && a.includes("x")))return done("Gunakan -t untuk daftar isi atau -x untuk ekstraksi.");
      if(state.fs[destination]?.type!=="dir")return done(`${command}: direktori tujuan belum ada; buat dengan mkdir`);
      for(const [name,entry] of Object.entries(archive.entries)) {
        const target=normalizePath(name,destination);
        if(!target.startsWith(destination==="/" ? "/" : destination+"/"))throw new Error(`${command}: path arsip di luar direktori tujuan`);
        mkdir(parentPath(target));put(target,entry.content,{mode:entry.mode});
      }
      return done();
    }
    return done();
  } catch(error) {return done(error instanceof Error ? error.message : `${command}: gagal memproses perintah`);}
}
