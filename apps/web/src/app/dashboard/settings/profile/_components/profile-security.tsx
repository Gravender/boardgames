"use client";

import { DeleteAccountCard } from "~/components/better-auth/account/delete-account-card";
import { ChangePasswordCard } from "~/components/better-auth/sessions/change-password";
import { SessionsCard } from "~/components/better-auth/sessions/sessions-card";

export function ProfileSecurity() {
  return (
    <div className="space-y-6">
      <SessionsCard />
      <ChangePasswordCard />
      <DeleteAccountCard />
    </div>
  );
}
