import { Button, Checkbox, Modal, TextArea, TextField, useOverlayState } from "@heroui/react";
import { UsersIcon } from "lucide-react";
import { useState } from "react";
import { useChatStore } from "../../store/useChatStore";
import { useRoomStore } from "../../store/useRoomStore";

const MAX_DESCRIPTION_LENGTH = 300;

function CreateRoomForm({ onClose }) {
  const users = useChatStore((state) => state.users);
  const createRoom = useRoomStore((state) => state.createRoom);
  const setActiveRoomId = useRoomStore((state) => state.setActiveRoomId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isCreating, setIsCreating] = useState(false);

  const toggleMember = (userId) => {
    const next = new Set(selectedIds);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setSelectedIds(next);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    const room = await createRoom({ name, description, memberIds: Array.from(selectedIds) });
    setIsCreating(false);
    if (room) {
      setActiveRoomId(room._id);
      onClose();
    }
  };

  return (
    <>
      <Modal.Body className="space-y-4 pt-4">
        <TextField fullWidth variant="secondary" label="Room name" placeholder="e.g. Weekend Trip Planning" value={name} onChange={(value) => setName(value)} maxLength={80} />
        <TextArea fullWidth variant="secondary" label="Description (optional)" placeholder="What's this room about?" rows={2} value={description} onChange={(event) => setDescription(event.target.value.slice(0, MAX_DESCRIPTION_LENGTH))} />
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <UsersIcon className="size-4" />
            Add members
          </p>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
            {users.length === 0 ? (
              <p className="p-2 text-sm text-muted">No other users yet.</p>
            ) : (
              users.map((user) => (
                <label key={user._id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface">
                  <Checkbox isSelected={selectedIds.has(user._id)} onChange={() => toggleMember(user._id)} />
                  <span className="text-sm">{user.fullName}</span>
                </label>
              ))
            )}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer className="border-t border-border pt-3">
        <Button variant="ghost" onPress={onClose} isDisabled={isCreating}>Cancel</Button>
        <Button variant="primary" onPress={handleCreate} isDisabled={isCreating || !name.trim()}>
          {isCreating ? "Creating..." : "Create room"}
        </Button>
      </Modal.Footer>
    </>
  );
}

export function CreateRoomModal() {
  const modal = useOverlayState();
  return (
    <Modal.Root state={modal}>
      <Modal.Trigger>
        <Button variant="secondary" size="sm">New room</Button>
      </Modal.Trigger>
      <Modal.Backdrop variant="opaque">
        <Modal.Container size="md" scroll="inside" placement="center">
          <Modal.Dialog className="border border-border bg-background text-foreground shadow-2xl">
            <Modal.Header className="flex flex-row items-center justify-between gap-3 border-b border-border pb-3">
              <Modal.Heading className="text-lg font-semibold tracking-tight">Create a room</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            {modal.isOpen ? <CreateRoomForm onClose={modal.close} /> : null}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
