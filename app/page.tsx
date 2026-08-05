"use client";

import { AuthGate } from "@/components/auth-gate";
import { Dashboard } from "@/components/dashboard";

export default function Page() {
  return <AuthGate>{(user) => <Dashboard userId={user.id} email={user.email ?? ""} />}</AuthGate>;
}
