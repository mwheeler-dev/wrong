import { AuthForm } from "@/components/AuthForm";

// Intentionally does NOT auto-redirect logged-out users (or anyone) to /play.
// /play is the only place that gates on auth state. /login always renders the form.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
