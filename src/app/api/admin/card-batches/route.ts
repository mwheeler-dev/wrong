import { hasSameOrigin } from "@/lib/requestOrigin";
import { NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { validateBatch } from "@/cards/weekly";
export const dynamic="force-dynamic";
async function admin(){const user=await getCurrentUser();return user&&isAdmin(user.email);}
export async function GET(req:Request){
 if(!await admin()) return NextResponse.json({error:"Unauthorized"},{status:403});
 const week=new URL(req.url).searchParams.get("week")||"";
 const [batch,questions]=await Promise.all([prisma.cardBatch.findUnique({where:{week}}),prisma.question.findMany({orderBy:{publishDate:"desc"},take:1000,select:{id:true,text:true,category:true,status:true,publishDate:true,closesToPredictionsAt:true,resolutionDate:true,resolutionCriteria:true,correctAnswer:true}})]);
 return NextResponse.json({decks:batch?.payload,questions});
}
export async function PUT(req:Request){
 if(!await admin()) return NextResponse.json({error:"Unauthorized"},{status:403});
 if(!hasSameOrigin(req)) return NextResponse.json({error:"Invalid origin"},{status:403});
 try {const body=await req.json();if(typeof body.week!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(body.week)||new Date(body.week+"T12:00Z").getUTCDay()!==1) throw new Error("Choose a Monday");
 const decks=validateBatch(body.decks);await prisma.cardBatch.upsert({where:{week:body.week},create:{week:body.week,payload:JSON.parse(JSON.stringify(decks))},update:{payload:JSON.parse(JSON.stringify(decks))}});return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Save failed"},{status:400});}
}
