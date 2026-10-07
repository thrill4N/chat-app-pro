import { UsersRoundIcon } from "lucide-react";
import { useRoomStore } from "../../store/useRoomStore";

export function RoomListItem({ room }) {
  const activeRoomId = useRoomStore((state) => state.activeRoomId);
  const setActiveRoomId = useRoomStore((state) => state.setActiveRoomId);
  const isActive = activeRoomId === room._id;

  return (
    <button
      type="button"
      onClick={() => setActiveRoomId(room._id)}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
        isActive ? "bg-accent/10" : "hover:bg-surface"
      }`}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-muted">
        <UsersRoundIcon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{room.name}</span>
        <span className="block truncate text-xs text-muted">
          {room.members.length} member{room.members.length === 1 ? "" : "s"}
        </span>
      </span>
    </button>
  );
}
