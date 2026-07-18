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
  createdBy: string;
  createdAt: string;
};

export type GroupMember = {
  groupId: string;
  userId: string;
  role: "owner" | "admin" | "member";
};

export type Memory = {
  id: string;
  groupId: string;
  title: string;
  description: string;
  imageUrl?: string;
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
