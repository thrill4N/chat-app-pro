import { Button, TextArea } from "@heroui/react";
import { ImageIcon, LogOutIcon, SendIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { useRoomStore } from "../../store/useRoomStore";
import { ManageMembersModal } from "./ManageMembersModal";

const MAX_TEXT_LENGTH = 5000;

function memberId(member) {
  return typeof member.userId === "object" ? member.userId._id : member.userId;
}
function senderName(message, room) {
  const member = room.members.find((m) => memberId(m) === message.senderId);
  if (member && typeof member.userId === "object") return member.userId.fullName;
  return "Member";
}

function RoomComposer({ roomId }) {
  const sendRoomMessage = useRoomStore((state) => state.sendRoomMessage);
  const isSendingRoomMessage = useRoomStore((state) => state.isSendingRoomMessage);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !file) return;
    const formData = new FormData();
    if (trimmed) formData.append("text", trimmed);
    if (file) formData.append("media", file);
    await sendRoomMessage(roomId, formData);
    setText("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex items-end gap-2 border-t border-border p-3">
      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} />
      <Button variant="ghost" size="sm" isIconOnly onPress={() => fileInputRef.current?.click()} className={file ? "text-accent" : "text-muted"}>
        <ImageIcon className="size-5" />
      </Button>
      <TextArea
        fullWidth
        variant="secondary"
        rows={1}
        placeholder="Message the room"
        value={text}
        onChange={(event) => setText(event.target.value.slice(0, MAX_TEXT_LENGTH))}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSend();
          }
        }}
      />
      <Button variant="primary" size="sm" isIconOnly onPress={handleSend} isDisabled={isSendingRoomMessage || (!text.trim() && !file)}>
        <SendIcon className="size-4" />
      </Button>
    </div>
  );
}

export function RoomChatWindow({ room }) {
  const authUser = useAuthStore((state) => state.authUser);
  const roomMessages = useRoomStore((state) => state.roomMessages);
  const isRoomMessagesLoading = useRoomStore((state) => state.isRoomMessagesLoading);
  const leaveRoom = useRoomStore((state) => state.leaveRoom);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [roomMessages]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="font-semibold">{room.name}</p>
          {room.description ? <p className="text-xs text-muted">{room.description}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <ManageMembersModal room={room} />
          <Button variant="ghost" size="sm" isIconOnly onPress={() => leaveRoom(room._id)}>
            <LogOutIcon className="size-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {isRoomMessagesLoading ? (
          <p className="text-center text-sm text-muted">Loading messages...</p>
        ) : (
          roomMessages.map((message) => {
            const isOwn = message.senderId === authUser._id;
            const isRemoved = message.moderationStatus === "flagged" || message.fileScanStatus === "flagged";
            return (
              <div key={message._id} className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                {!isOwn && <p className="mb-0.5 px-1 text-xs text-muted">{senderName(message, room)}</p>}
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${isOwn ? "bg-accent text-accent-foreground" : "bg-surface"} ${isRemoved ? "italic text-muted" : ""}`}>
                  {!isRemoved && message.image && <img src={message.image} alt="" className="mb-1 max-w-full rounded-lg" />}
                  {!isRemoved && message.video && <video src={message.video} controls className="mb-1 max-w-full rounded-lg" />}
                  {message.text && <p>{message.text}</p>}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <RoomComposer roomId={room._id} />
    </div>
  );
}
