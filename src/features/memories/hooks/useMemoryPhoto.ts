"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/features/auth/contexts/AuthContext";
import { loadMemoryPhoto } from "@/features/memories/apis/cloudinaryPhotos";
import type { MemoryPhoto } from "@/features/memories/utils/memoryPhotos";

type UseMemoryPhotoResult = {
  url?: string;
  error?: string;
  retry: () => void;
  markBroken: () => void;
};

export function useMemoryPhoto(groupId: string, memoryId: string, photo: MemoryPhoto): UseMemoryPhotoResult {
  const { user, isAuthLoading } = useAuth();
  const [state, setState] = useState<{ url?: string; error?: string; userId?: string; publicId?: string }>({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (isAuthLoading || !user) return;
    let active = true;
    let url: string | undefined;
    void loadMemoryPhoto(groupId, memoryId, photo).then((value) => {
      url = value;
      if (active) setState({ url: value, userId: user.id, publicId: photo.publicId });
      else URL.revokeObjectURL(value);
    }).catch((error: unknown) => {
      if (active) setState({ error: error instanceof Error ? error.message : "Photo could not be loaded.", userId: user.id, publicId: photo.publicId });
    });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [groupId, memoryId, photo, user, isAuthLoading, attempt]);

  const current = state.userId === user?.id && state.publicId === photo.publicId ? state : {};
  return {
    url: current.url,
    error: current.error,
    retry: () => { setState({}); setAttempt((value) => value + 1); },
    markBroken: () => setState({ error: "Photo could not be displayed.", userId: user?.id, publicId: photo.publicId }),
  };
}
