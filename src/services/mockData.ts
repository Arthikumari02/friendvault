import type {
  Comment,
  Group,
  GroupMember,
  Memory,
  Reaction,
  User,
} from "@/types";

export const mockUsers: User[] = [
  {
    id: "user-1",
    name: "Aarav Mehta",
    email: "aarav@example.com",
    initials: "AM",
    createdAt: "2024-02-11T09:00:00.000Z",
  },
  {
    id: "user-2",
    name: "Maya Shah",
    email: "maya@example.com",
    initials: "MS",
    createdAt: "2024-02-12T09:00:00.000Z",
  },
  {
    id: "user-3",
    name: "Kabir Rao",
    email: "kabir@example.com",
    initials: "KR",
    createdAt: "2024-02-13T09:00:00.000Z",
  },
  {
    id: "user-4",
    name: "Riya Sen",
    email: "riya@example.com",
    initials: "RS",
    createdAt: "2024-02-14T09:00:00.000Z",
  },
];

export const mockGroups: Group[] = [
  {
    id: "college-circle",
    name: "College Circle",
    description:
      "Four years of canteen debates, late submissions, birthday surprises, and trips that still get retold.",
    coverImage: "from-indigo-500 via-purple-300 to-amber-100",
    coverCaption: "The people who made campus feel like home.",
    createdBy: "user-1",
    createdAt: "2021-07-12T10:30:00.000Z",
  },
  {
    id: "goa-crew",
    name: "Goa Crew",
    description:
      "The annual travel group archive for beach mornings, lost sunglasses, and playlists no one skips.",
    coverImage: "from-sky-300 via-indigo-300 to-purple-300",
    coverCaption: "One trip became a tradition.",
    createdBy: "user-2",
    createdAt: "2022-05-18T08:15:00.000Z",
  },
];

export const mockGroupMembers: GroupMember[] = [
  { groupId: "college-circle", userId: "user-1", role: "owner" },
  { groupId: "college-circle", userId: "user-2", role: "admin" },
  { groupId: "college-circle", userId: "user-3", role: "member" },
  { groupId: "college-circle", userId: "user-4", role: "member" },
  { groupId: "goa-crew", userId: "user-1", role: "member" },
  { groupId: "goa-crew", userId: "user-2", role: "owner" },
  { groupId: "goa-crew", userId: "user-4", role: "member" },
];

export const mockMemories: Memory[] = [
  {
    id: "memory-1",
    groupId: "college-circle",
    title: "Birthday Surprise",
    description:
      "The whole class pretended to forget, then walked in with cake during the lab break. The candles melted before anyone stopped laughing.",
    imageUrl: "/memories/birthday.svg",
    imageTone: "warm flash photo",
    location: "North Campus",
    uploadedBy: "user-2",
    memoryDate: "2026-06-14T16:30:00.000Z",
    createdAt: "2026-06-15T11:20:00.000Z",
    caption: "The projector hid the cake. Barely.",
  },
  {
    id: "memory-2",
    groupId: "college-circle",
    title: "Monsoon Chai After Exam",
    description:
      "Nobody remembered the answers, but everyone remembered the rain and two hours at the tea stall while shoes dried under the bench.",
    imageUrl: "/memories/chai.svg",
    imageTone: "rainy blue afternoon",
    location: "Old Tea Stall",
    uploadedBy: "user-1",
    memoryDate: "2025-08-03T12:00:00.000Z",
    createdAt: "2025-08-03T19:45:00.000Z",
    caption: "Proof that bad exams make good stories.",
  },
  {
    id: "memory-4",
    groupId: "college-circle",
    title: "Graduation Day",
    description:
      "Caps in the air, parents trying to take the same photo six times, and one last slow walk past the library steps.",
    imageUrl: "/memories/graduation.svg",
    imageTone: "golden ceremony light",
    location: "Main Quad",
    uploadedBy: "user-4",
    memoryDate: "2024-04-28T10:00:00.000Z",
    createdAt: "2024-04-29T08:30:00.000Z",
    caption: "The day the group chat became permanent.",
  },
  {
    id: "memory-3",
    groupId: "goa-crew",
    title: "Goa Trip 2026",
    description:
      "The quietest twenty minutes of the trip, right before everyone argued about breakfast and who lost the room key.",
    imageUrl: "/memories/goa-trip.svg",
    imageTone: "soft sunrise beach",
    location: "Mandrem",
    uploadedBy: "user-1",
    memoryDate: "2026-01-19T01:00:00.000Z",
    createdAt: "2026-01-20T07:10:00.000Z",
    caption: "Sunrise before the drive home.",
  },
];

export const mockComments: Comment[] = [
  {
    id: "comment-1",
    memoryId: "memory-1",
    userId: "user-1",
    text: "Still cannot believe we hid that cake behind the projector.",
    createdAt: "2026-06-15T12:05:00.000Z",
  },
  {
    id: "comment-2",
    memoryId: "memory-1",
    userId: "user-3",
    text: "Best fake-forgotten birthday performance.",
    createdAt: "2026-06-15T12:22:00.000Z",
  },
];

export const mockReactions: Reaction[] = [
  { id: "reaction-1", memoryId: "memory-1", userId: "user-1", reactionType: "heart" },
  { id: "reaction-2", memoryId: "memory-1", userId: "user-3", reactionType: "laugh" },
  { id: "reaction-3", memoryId: "memory-2", userId: "user-2", reactionType: "nostalgia" },
  { id: "reaction-4", memoryId: "memory-3", userId: "user-4", reactionType: "spark" },
];
