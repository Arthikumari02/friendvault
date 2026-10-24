export type User = {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
  initials?: string;
  createdAt: string;
};

export type Group = {
  id: string;
  name: string;
  description: string;
  coverImage?: string;
  coverCaption?: string;
  inviteCode?: string;
  createdBy: string;
  createdAt: string;
};

export type GroupMember = {
  groupId: string;
  userId: string;
  role: "owner" | "admin" | "member";
  displayName: string;
  joinedAt: string;
};

export type GroupInvitation = {
  groupId: string;
  inviteeId: string;
  invitedBy: string;
  createdAt: string;
};

export type Memory = {
  id: string;
  groupId: string;
  title: string;
  description: string;
  imageUrl?: string;
  imagePath?: string;
  photos?: import("@/features/memories/utils/memoryPhotos").MemoryPhoto[];
  imageTone?: string;
  location?: string;
  uploadedBy: string;
  memoryDate: string;
  createdAt: string;
  caption?: string;
};

export type Comment = {
  id: string;
  memoryId: string;
  userId: string;
  text: string;
  createdAt: string;
};

export type Reaction = {
  id: string;
  memoryId: string;
  userId: string;
  reactionType: "heart" | "laugh" | "spark" | "nostalgia";
};

export type GroupSummary = Group & {
  memberCount: number;
  totalMemories: number;
  lastActivity: string;
  yearsTogether: number;
  memberAvatars: string[];
  latestMemory?: MemoryWithUser;
};

export type MemoryWithUser = Memory & {
  uploadedByName: string;
};
