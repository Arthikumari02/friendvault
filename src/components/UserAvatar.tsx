"use client";

import { useState } from "react";
import Image from "next/image";
import type { User } from "@/types";

export function UserAvatar({ user }: { user: User }) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const photo = user.profileImage;

  return photo && photo !== failedPhoto
    ? <Image src={photo} alt="" width={34} height={34} unoptimized className="user-avatar-image" onError={() => setFailedPhoto(photo)} />
    : <>{user.initials?.slice(0, 1) || "F"}</>;
}
