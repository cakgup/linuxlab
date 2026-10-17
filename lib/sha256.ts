/** SHA-256 over UTF-8 fixture bytes, synchronous for the in-browser teaching shell. */
export function sha256(text:string):string {
  const bytes=new TextEncoder().encode(text);
  const size=Math.ceil((bytes.length+9)/64)*64;
  const data=new Uint8Array(size);data.set(bytes);data[bytes.length]=128;
  const view=new DataView(data.buffer);
  view.setUint32(size-8,Math.floor(bytes.length/0x20000000));view.setUint32(size-4,(bytes.length*8)>>>0);
  const primes:number[]=[];
  for(let n=2;primes.length<64;n++)if(!primes.some(p=>p*p<=n && n%p===0))primes.push(n);
  const constants=primes.map(p=>(Math.cbrt(p)%1*0x100000000)>>>0);
  const hash=primes.slice(0,8).map(p=>(Math.sqrt(p)%1*0x100000000)>>>0);
  const rotate=(n:number,bits:number)=>(n>>>bits)|(n<<(32-bits));
  for(let offset=0;offset<size;offset+=64){
    const w:number[]=[];
    for(let i=0;i<64;i++){
      if(i<16)w[i]=view.getUint32(offset+i*4);
      else {const a=w[i-15],b=w[i-2];w[i]=(w[i-16]+(rotate(a,7)^rotate(a,18)^(a>>>3))+w[i-7]+(rotate(b,17)^rotate(b,19)^(b>>>10)))>>>0;}
    }
    let [a,b,c,d,e,f,g,h]=hash;
    for(let i=0;i<64;i++){
      const t1=(h+(rotate(e,6)^rotate(e,11)^rotate(e,25))+((e&f)^(~e&g))+constants[i]+w[i])>>>0;
      const t2=((rotate(a,2)^rotate(a,13)^rotate(a,22))+((a&b)^(a&c)^(b&c)))>>>0;
      h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
    }
    [a,b,c,d,e,f,g,h].forEach((n,i)=>hash[i]=(hash[i]+n)>>>0);
  }
  return hash.map(n=>n.toString(16).padStart(8,"0")).join("");
}
