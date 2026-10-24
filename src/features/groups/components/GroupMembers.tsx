import { UserAvatar } from "@/components/UserAvatar";
import type { GroupMember, User } from "@/types";

interface GroupMembersProps {
  members: GroupMember[];
  viewer: User;
  viewerRole: GroupMember["role"];
  memoryCount: number;
  busy: boolean;
  onChangeMember: (member: GroupMember, action: "remove" | "admin" | "member") => void;
}

export function GroupMembers({ members, viewer, viewerRole, memoryCount, busy, onChangeMember }: GroupMembersProps) {
  return <section className="group-people" aria-labelledby="people-heading">
    <div className="group-people-list">
      <h2 id="people-heading"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="7" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1"/></svg>Your people</h2>
      {members.map((member) => <div className="group-person" key={member.userId}>
        <span className={`group-person-avatar${member.role === "owner" ? " group-person-avatar-owner" : ""}`}>
          {member.userId === viewer.id ? <UserAvatar user={viewer} /> : member.displayName.trim().slice(0, 1).toUpperCase() || "F"}
        </span>
        <div>
          <strong>{member.userId === viewer.id ? viewer.name : member.displayName}</strong>
          {member.userId === viewer.id && viewer.email ? <small>{viewer.email}</small> : null}
          <small>{member.role === "owner" ? "Vault owner" : member.role === "admin" ? "Admin" : "Friend"}</small>
        </div>
        {viewerRole === "owner" && member.role !== "owner" ? <div className="group-person-actions">
          <button disabled={busy} onClick={() => onChangeMember(member, member.role === "admin" ? "member" : "admin")}>{member.role === "admin" ? "Make friend" : "Make admin"}</button>
          <button disabled={busy} onClick={() => onChangeMember(member, "remove")}>Remove</button>
        </div> : null}
      </div>)}
    </div>
    <div className="group-counts"><div><strong>{members.length}</strong><span>Friends</span></div><div><strong>{memoryCount}</strong><span>Memories</span></div></div>
  </section>;
}
