import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUserId } from "@/lib/session";

export default async function SignupPage() {
  const id = await getCurrentUserId();
  if (id) redirect("/play");
  return <AuthForm mode="signup" />;
}
