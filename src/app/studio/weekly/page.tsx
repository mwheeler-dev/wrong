import {getCurrentUser,isAdmin} from "@/lib/session";
import WeeklyStudio from "@/components/cards/WeeklyStudio";
export const dynamic="force-dynamic";
export default async function Page(){const user=await getCurrentUser();if(!user||!isAdmin(user.email))return <p>Admin access required.</p>;return <WeeklyStudio/>;}
