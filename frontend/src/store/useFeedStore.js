import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

export const useFeedStore = create((set, get) => ({
  posts: [],
  isLoading: false,
  isSubmitting: false,

  loadFeed: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/feed");
      set({ posts: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load feed");
    } finally {
      set({ isLoading: false });
    }
  },

  createPost: async (body) => {
    set({ isSubmitting: true });
    try {
      await axiosInstance.post("/feed/posts", { body });
      await get().loadFeed();
      toast.success("Post shared");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to publish post");
      return false;
    } finally {
      set({ isSubmitting: false });
    }
  },

  createReply: async (postId, body) => {
    set({ isSubmitting: true });
    try {
      await axiosInstance.post(`/feed/posts/${postId}/replies`, { body });
      await get().loadFeed();
      toast.success("Reply sent");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send reply");
      return false;
    } finally {
      set({ isSubmitting: false });
    }
  },

  toggleReaction: async (targetId, kind, targetType = "post") => {
    set({ isSubmitting: true });
    try {
      await axiosInstance.post(`/feed/reactions/${targetId}`, { targetType, kind });
      await get().loadFeed();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update reaction");
      return false;
    } finally {
      set({ isSubmitting: false });
    }
  },
}));
