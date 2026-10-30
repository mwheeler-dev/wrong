// Shared local Inter files keep browser previews and PNG exports on the same font.
import { readFile } from "node:fs/promises";
import path from "node:path";
type LoadedFont = { name:string;data:ArrayBuffer;weight:500|700|900;style:"normal" };
let cache:Promise<LoadedFont[]>|null=null;
export function loadCardFonts():Promise<LoadedFont[]> {
 if(cache)return cache;
 cache=Promise.all(([900,700,500] as const).map(async weight=>({
  name:"Inter",data:new Uint8Array(await readFile(path.join(process.cwd(),`public/fonts/card-inter-${weight}.ttf`))).buffer,weight,style:"normal" as const,
 }))).catch(error=>{cache=null;throw error;});
 return cache;
}
