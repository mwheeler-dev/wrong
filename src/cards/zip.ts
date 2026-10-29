// Uncompressed ZIP: PNGs are already compressed. No extra runtime dependency.
export function zip(files:{name:string;data:Uint8Array}[]):Blob {
 const parts:BlobPart[]=[];const central:BlobPart[]=[];let offset=0,size=0;
 const header=(n:number)=>new DataView(new ArrayBuffer(n));
 for(const f of files){
  const name=new TextEncoder().encode(f.name);let crc=0xffffffff;
  for(const b of f.data){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}crc=(crc^0xffffffff)>>>0;
  const h=header(30);h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint32(14,crc,true);h.setUint32(18,f.data.length,true);h.setUint32(22,f.data.length,true);h.setUint16(26,name.length,true);
  parts.push(h.buffer,name,new Uint8Array(f.data).buffer);
  const c=header(46);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint32(16,crc,true);c.setUint32(20,f.data.length,true);c.setUint32(24,f.data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);central.push(c.buffer,name);size+=46+name.length;offset+=30+name.length+f.data.length;
 }
 const end=header(22);end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);end.setUint32(12,size,true);end.setUint32(16,offset,true);
 return new Blob([...parts,...central,end.buffer],{type:"application/zip"});
}
