import { Button, Modal, TextArea, TextField, useOverlayState } from "@heroui/react";
import { SettingsIcon } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";

const MAX_BIO_LENGTH = 160;
const MAX_STATUS_LENGTH = 40;

// Owns the form's local edit state, initialized once from the current
// profile via lazy useState initializers. The parent only mounts this
// while the modal is open, so every open is a fresh mount with fresh
// state -- no effect needed to "reset" stale values.
function ProfileForm({ authUser, onClose }) {
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const isUpdatingProfile = useAuthStore((state) => state.isUpdatingProfile);

  const [username, setUsername] = useState(() => authUser?.username || "");
  const [bio, setBio] = useState(() => authUser?.bio || "");
  const [status, setStatus] = useState(() => authUser?.status || "");
  const [lastSeenPolicy, setLastSeenPolicy] = useState(() => authUser?.lastSeenPolicy || "everyone");

  const handleSave = async () => {
    const didUpdate = await updateProfile({ username, bio, status, lastSeenPolicy });
    if (didUpdate) onClose();
  };

  return (
    <>
      <Modal.Body className="space-y-4 pt-4">
        <TextField
          fullWidth
          variant="secondary"
          label="Username"
          placeholder="e.g. jane_doe"
          value={username}
          onChange={(value) => setUsername(value)}
          maxLength={20}
        />

        <TextField
          fullWidth
          variant="secondary"
          label="Status"
          placeholder="Available"
          value={status}
          onChange={(value) => setStatus(value)}
          maxLength={MAX_STATUS_LENGTH}
        />

        <div className="space-y-1.5">
          <TextArea
            fullWidth
            variant="secondary"
            label="Bio"
            placeholder="Tell people a bit about yourself"
            rows={3}
            value={bio}
            onChange={(event) => setBio(event.target.value.slice(0, MAX_BIO_LENGTH))}
          />
          <p className="text-right text-xs text-muted">
            {bio.length}/{MAX_BIO_LENGTH}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="last-seen-policy">
            Who can see when I'm online
          </label>
          <select
            id="last-seen-policy"
            value={lastSeenPolicy}
            onChange={(event) => setLastSeenPolicy(event.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
          >
            <option value="everyone">Everyone</option>
            <option value="nobody">Nobody</option>
          </select>
        </div>
      </Modal.Body>

      <Modal.Footer className="border-t border-border pt-3">
        <Button variant="ghost" onPress={onClose} isDisabled={isUpdatingProfile}>
          Cancel
        </Button>
        <Button variant="primary" onPress={handleSave} isDisabled={isUpdatingProfile}>
          {isUpdatingProfile ? "Saving..." : "Save"}
        </Button>
      </Modal.Footer>
    </>
  );
}

export function ProfileSettingsModal() {
  const modal = useOverlayState();
  const authUser = useAuthStore((state) => state.authUser);

  return (
    <Modal.Root state={modal}>
      <Modal.Trigger>
        <Button variant="ghost" size="sm" isIconOnly className="text-foreground">
          <SettingsIcon className="size-5" />
        </Button>
      </Modal.Trigger>

      <Modal.Backdrop variant="opaque">
        <Modal.Container size="md" scroll="inside" placement="center">
          <Modal.Dialog className="border border-border bg-background text-foreground shadow-2xl">
            <Modal.Header className="flex flex-row items-center justify-between gap-3 border-b border-border pb-3">
              <Modal.Heading className="text-lg font-semibold tracking-tight">
                Edit profile
              </Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>

            {modal.isOpen ? <ProfileForm authUser={authUser} onClose={modal.close} /> : null}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal.Root>
  );
}
