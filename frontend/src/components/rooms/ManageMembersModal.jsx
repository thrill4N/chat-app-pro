import { Button, Modal, useOverlayState } from "@heroui/react";
import { CrownIcon, ShieldIcon, UserMinusIcon } from "lucide-react";
import { useAuthStore } from "../../store/useAuthStore";
import { useRoomStore } from "../../store/useRoomStore";

function memberLabel(member) {
  if (typeof member.userId === "object" && member.userId?.fullName) return member.userId.fullName;
  return typeof member.userId === "string" ? member.userId : member.userId?._id;
}
function memberId(member) {
  return typeof member.userId === "object" ? member.userId._id : member.userId;
}
function RoleBadge({ role }) {
  if (role === "owner") {
    return <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600"><CrownIcon className="size-3" /> Owner</span>;
  }
  if (role === "admin") {
    return <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent"><ShieldIcon className="size-3" /> Admin</span>;
  }
  return <span className="text-xs text-muted">Member</span>;
}

function ManageMembersForm({ room }) {
  const authUser = useAuthStore((state) => state.authUser);
  const removeMember = useRoomStore((state) => state.removeMember);
  const updateMemberRole = useRoomStore((state) => state.updateMemberRole);
  const myMembership = room.members.find((member) => memberId(member) === authUser._id);
  const canManage = myMembership?.role === "owner" || myMembership?.role === "admin";
  const isOwner = myMembership?.role === "owner";

  return (
    <Modal.Body className="space-y-1 pt-4">
      {room.members.map((member) => {
        const id = memberId(member);
        const isSelf = id === authUser._id;
        const canRemove = canManage && !isSelf && member.role !== "owner" && (isOwner || member.role !== "admin");
        const canChangeRole = isOwner && !isSelf && member.role !== "owner";
        return (
          <div key={id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-surface">
            <div className="flex items-center gap-2">
              <span className="text-sm">{memberLabel(member)}</span>
              <RoleBadge role={member.role} />
            </div>
            <div className="flex items-center gap-1">
              {canChangeRole && (
                <Button variant="ghost" size="sm" onPress={() => updateMemberRole(room._id, id, member.role === "admin" ? "member" : "admin")}>
                  {member.role === "admin" ? "Demote" : "Make admin"}
                </Button>
              )}
              {canRemove && (
                <Button variant="ghost" size="sm" isIconOnly className="text-danger" onPress={() => removeMember(room._id, id)}>
                  <UserMinusIcon className="size-4" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </Modal.Body>
  );
}

export function ManageMembersModal({ room }) {
  const modal = useOverlayState();
  return (
    <Modal.Root state={modal}>
      <Modal.Trigger>
        <Button variant="ghost" size="sm">Members ({room.members.length})</Button>
      </Modal.Trigger>
      <Modal.Backdrop variant="opaque">
        <Modal.Container size="md" scroll="inside" placement="center">
          <Modal.Dialog className="border border-border bg-background text-foreground shadow-2xl">
            <Modal.Header className="flex flex-row items-center justify-between gap-3 border-b border-border pb-3">
              <Modal.Heading className="text-lg font-semibold tracking-tight">{room.name} · Members</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            {modal.isOpen ? <ManageMembersForm room={room} /> : null}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
