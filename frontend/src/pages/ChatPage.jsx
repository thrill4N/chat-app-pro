import { useWallpaper } from "../context/wallpaper";
import { useChatStore } from "../store/useChatStore";
import { useRoomStore } from "../store/useRoomStore";
import { useSelectedConversation } from "../hooks/useSelectedConversation";
import { useEffect } from "react";
import ChatSidebar from "../components/chat/ChatSidebar";
import { ChatHeader } from "../components/chat/ChatHeader";
import { MessageList } from "../components/chat/MessageList";
import { ChatComposer } from "../components/chat/ChatComposer";
import { RoomChatWindow } from "../components/rooms/RoomChatWindow";

function ChatPage() {
  const { frameStyle } = useWallpaper();
  const getConversations = useChatStore((state) => state.getConversations);
  const getMessages = useChatStore((state) => state.getMessages);
  const getUsers = useChatStore((state) => state.getUsers);
  const subscribeToMessages = useChatStore((state) => state.subscribeToMessages);
  const unsubscribeFromMessages = useChatStore((state) => state.unsubscribeFromMessages);
  const getRooms = useRoomStore((state) => state.getRooms);
  const subscribeToRoomEvents = useRoomStore((state) => state.subscribeToRoomEvents);
  const unsubscribeFromRoomEvents = useRoomStore((state) => state.unsubscribeFromRoomEvents);
  const activeRoomId = useRoomStore((state) => state.activeRoomId);
  const rooms = useRoomStore((state) => state.rooms);
  const activeRoom = rooms.find((room) => room._id === activeRoomId) || null;
  const { activeConversation, activeConversationId, isLargeScreen } = useSelectedConversation();
  const hasActivePane = Boolean(activeConversationId || activeRoomId);

  useEffect(() => {
    getUsers();
    getConversations();
  }, [getConversations, getUsers]);

  useEffect(() => {
    if (!activeConversationId) return;
    getMessages(activeConversationId);
    subscribeToMessages(activeConversationId);
    return () => unsubscribeFromMessages();
  }, [getMessages, activeConversationId, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    getRooms();
    subscribeToRoomEvents();
    return () => unsubscribeFromRoomEvents();
  }, [getRooms, subscribeToRoomEvents, unsubscribeFromRoomEvents]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden p-2 sm:p-3 md:p-8" style={frameStyle}>
      <div className="mx-auto flex w-full max-w-6xl flex-1 overflow-hidden rounded-2xl border border-border bg-background text-foreground">
        <ChatSidebar />
        <div className={`flex-1 flex-col overflow-hidden ${!isLargeScreen && !hasActivePane ? "hidden lg:flex" : "flex"}`}>
          {activeRoom ? (
            <RoomChatWindow room={activeRoom} />
          ) : (
            <>
              <ChatHeader />
              <MessageList />
              {activeConversation ? <ChatComposer /> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
export default ChatPage;
