import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:3000" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  isUpdatingProfile: false,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    set({ isCheckingAuth: true });

    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });

      get().connectSocket(res.data);
    } catch (error) {
      console.error("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  // Only app-owned fields (username, bio, status, lastSeenPolicy) go through
  // this endpoint. fullName/email/profilePic stay Clerk-sourced and are
  // edited through Clerk's own account UI, not here.
  updateProfile: async (updates) => {
    set({ isUpdatingProfile: true });
    try {
      const res = await axiosInstance.patch("/users/me", updates);
      set({ authUser: res.data });
      toast.success("Profile updated");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
      return false;
    } finally {
      set({ isUpdatingProfile: false });
    }
  },

  clearAuth: () => {
    set({ authUser: null, isCheckingAuth: false, onlineUsers: [] });
    get().disconnectSocket();
  },

  connectSocket: (user) => {
    if (!user || get().socket?.connected) return;

    const socket = io(BASE_URL, { query: { userId: user._id } });

    set({ socket });

    socket.on("getOnlineUsers", (userIds) => {
      set({ onlineUsers: userIds });
    });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket?.connected) socket.disconnect();
    set({ socket: null });
  },
}));
