import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // Redirect based on role
  if (session.user.role === "ADMIN") {
    redirect("/admin/payouts");
  } else {
    redirect("/dashboard");
  }
}
