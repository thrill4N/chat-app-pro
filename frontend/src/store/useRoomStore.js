import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";
import { useChatStore } from "./useChatStore";

export const useRoomStore = create((set, get) => ({
  rooms: [],
  isRoomsLoading: false,
  activeRoomId: null,
  roomMessages: [],
  isRoomMessagesLoading: false,
  isSendingRoomMessage: false,

  getRooms: async () => {
    set({ isRoomsLoading: true });
    try {
      const res = await axiosInstance.get("/rooms");
      set({ rooms: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load rooms");
    } finally {
      set({ isRoomsLoading: false });
    }
  },

  createRoom: async ({ name, description, memberIds }) => {
    try {
      const res = await axiosInstance.post("/rooms", { name, description, memberIds });
      set({ rooms: [res.data, ...get().rooms] });
      toast.success("Room created");
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create room");
      return null;
    }
  },

  setActiveRoomId: (roomId) => {
    set({ activeRoomId: roomId, roomMessages: [] });
    if (roomId) {
      useChatStore.getState().setActiveConversationId(null);
      get().getRoomMessages(roomId);
    }
  },

  getRoomMessages: async (roomId) => {
    set({ isRoomMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/rooms/${roomId}/messages`);
      if (get().activeRoomId === roomId) set({ roomMessages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load messages");
    } finally {
      set({ isRoomMessagesLoading: false });
    }
  },

  sendRoomMessage: async (roomId, formData) => {
    set({ isSendingRoomMessage: true });
    try {
      await axiosInstance.post(`/rooms/${roomId}/messages`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    } finally {
      set({ isSendingRoomMessage: false });
    }
  },

  addMember: async (roomId, userId) => {
    try {
      const res = await axiosInstance.post(`/rooms/${roomId}/members`, { userId });
      set({ rooms: get().rooms.map((room) => (room._id === roomId ? res.data : room)) });
      toast.success("Member added");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add member");
    }
  },

  removeMember: async (roomId, userId) => {
    try {
      const res = await axiosInstance.delete(`/rooms/${roomId}/members/${userId}`);
      set({ rooms: get().rooms.map((room) => (room._id === roomId ? res.data : room)) });
      toast.success("Member removed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove member");
    }
  },

  updateMemberRole: async (roomId, userId, role) => {
    try {
      const res = await axiosInstance.patch(`/rooms/${roomId}/members/${userId}/role`, { role });
      set({ rooms: get().rooms.map((room) => (room._id === roomId ? res.data : room)) });
      toast.success("Role updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update role");
    }
  },

  leaveRoom: async (roomId) => {
    try {
      await axiosInstance.post(`/rooms/${roomId}/leave`);
      set({ rooms: get().rooms.filter((room) => room._id !== roomId) });
      if (get().activeRoomId === roomId) set({ activeRoomId: null, roomMessages: [] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to leave room");
    }
  },

  subscribeToRoomEvents: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newRoomMessage");
    socket.on("newRoomMessage", (message) => {
      if (message.roomId === get().activeRoomId) {
        set({ roomMessages: [...get().roomMessages, message] });
      }
      set({
        rooms: get().rooms.map((room) =>
          room._id === message.roomId ? { ...room, updatedAt: message.createdAt } : room,
        ),
      });
    });
    socket.off("roomMembersUpdated");
    socket.on("roomMembersUpdated", ({ roomId, members }) => {
      set({ rooms: get().rooms.map((room) => (room._id === roomId ? { ...room, members } : room)) });
    });
    socket.off("messageFlagged");
    socket.on("messageFlagged", ({ messageId, roomId }) => {
      if (roomId && roomId === get().activeRoomId) {
        set({
          roomMessages: get().roomMessages.map((message) =>
            message._id === messageId
              ? { ...message, text: "[removed for violating community guidelines]", image: undefined, video: undefined, file: undefined }
              : message,
          ),
        });
      }
    });
  },

  unsubscribeFromRoomEvents: () => {
    const socket = useAuthStore.getState().socket;
    socket?.off("newRoomMessage");
    socket?.off("roomMembersUpdated");
    socket?.off("messageFlagged");
  },
}));
