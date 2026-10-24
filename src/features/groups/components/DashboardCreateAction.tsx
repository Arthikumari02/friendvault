"use client";

import { Button } from "@/components/Button";
import { useAuth } from "@/features/auth/contexts/AuthContext";

export function DashboardCreateAction() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Button href="/login" variant="secondary">
        Sign in to create
      </Button>
    );
  }

  return (
    <Button href="/groups/create" variant="warm">
      Create Group
    </Button>
  );
}
