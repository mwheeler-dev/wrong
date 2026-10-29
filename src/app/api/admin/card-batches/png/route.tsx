import { hasSameOrigin } from "@/lib/requestOrigin";
import { ImageResponse } from "next/og";
import { getCurrentUser,isAdmin } from "@/lib/session";
import { validateBatch } from "@/cards/weekly";
import { PromoSlide } from "@/cards/PromoSlide";
import { loadCardFonts } from "@/cards/fonts";
export const runtime="nodejs";
export async function POST(req:Request){
 const user=await getCurrentUser();if(!user||!isAdmin(user.email)) return new Response("Unauthorized",{status:403});
 if(!hasSameOrigin(req))return new Response("Invalid origin",{status:403});
 try {const {decks,deckIndex,index}=await req.json();const batch=validateBatch(decks);const deck=batch[deckIndex];if(!deck||!Number.isInteger(index)||!deck.slides[index])return new Response("Invalid slide",{status:400});
 return new ImageResponse(<PromoSlide deck={deck} index={index}/>,{width:1080,height:1920,fonts:await loadCardFonts(),headers:{"Cache-Control":"no-store"}});
 }catch{return new Response("Could not render slide",{status:400});}
}
