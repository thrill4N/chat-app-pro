import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.MODE === "development" ? "http://localhost:5001" : undefined);

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  isUpdatingProfile: false,
  isUploadingProfilePicture: false,
  onlineUsers: [],
  socket: null,

  checkAuth: async () => {
    set({ isCheckingAuth: true });

    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });

      await get().connectSocket(res.data);
    } catch (error) {
      console.error("Error in checkAuth:", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  // App-owned profile fields are collected here during onboarding and profile
  // setup, including username, bio, and profilePic before a user can access chat.
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

  uploadProfilePicture: async (file) => {
    set({ isUploadingProfilePicture: true });
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await axiosInstance.post("/users/me/profile-picture", formData);
      return res.data.profilePic;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to upload profile picture");
      return null;
    } finally {
      set({ isUploadingProfilePicture: false });
    }
  },

  clearAuth: () => {
    set({ authUser: null, isCheckingAuth: false, onlineUsers: [] });
    get().disconnectSocket();
  },

  connectSocket: async (user) => {
    if (!user || get().socket?.connected) return;

    let sessionToken = null;
    if (typeof window !== "undefined" && window.Clerk?.session?.getToken) {
      try {
        sessionToken = await window.Clerk.session.getToken();
      } catch (error) {
        console.error("Failed to fetch Clerk session token:", error);
      }
    }

    const socket = io(SOCKET_URL, {
      auth: { token: sessionToken },
      query: { userId: user._id },
    });

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
