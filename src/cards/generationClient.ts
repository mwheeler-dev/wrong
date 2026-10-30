import type { PromoSlide } from "./weekly";
export class CardRequestError extends Error {
 constructor(message:string,public retryable:boolean){super(message);}
}
/** One bounded automatic retry for transport/upstream failures after server-side repairs. */
export async function requestCardDeck(payload:unknown,onRetry:()=>void){
 for(let attempt=0;attempt<2;attempt++){
  try{
   const response=await fetch("/api/admin/card-batches/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw new CardRequestError(data.error||"Generation failed.",data.retryable!==false&&![400,401,403].includes(response.status));
   if(!data.deck||!Array.isArray(data.deck.slides)||data.deck.slides.length!==7)throw new CardRequestError("AI returned incomplete slides.",true);
   return data.deck as {caption:string;slides:PromoSlide[]};
  }catch(error){
   if((error instanceof CardRequestError&&!error.retryable)||attempt===1)throw error;
   onRetry();await new Promise(resolve=>setTimeout(resolve,1000));
  }
 }
 throw new CardRequestError("Could not generate this deck.",true);
}
