import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { hasSameOrigin } from "@/lib/requestOrigin";
import { cardGenerationOptions, generateCardDeck, CardGenerationError } from "@/cards/generation";
export const runtime="nodejs";
export const maxDuration=180;
let running=false;
export async function POST(req:Request){
 const {response}=await requireAdmin();if(response)return response;
 if(!hasSameOrigin(req))return NextResponse.json({error:"Forbidden"},{status:403});
 if(running)return NextResponse.json({error:"A deck is already generating. Wait a moment and retry."},{status:429});
 try{
  const options=cardGenerationOptions(await req.json().catch(()=>null));
  running=true;
  try{return NextResponse.json({deck:await generateCardDeck(options)},{headers:{"Cache-Control":"no-store"}});}finally{running=false;}
 }catch(e){return NextResponse.json({error:e instanceof CardGenerationError?e.message:"Could not generate this deck. Your other decks are safe.",retryable:e instanceof CardGenerationError?e.retryable:true},{status:e instanceof CardGenerationError?e.status:502});}
}
