import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Heart, MessageCircle, Flame, ArrowLeft } from "lucide-react";
import { useFeedStore } from "../store/useFeedStore";

const reactionStyles = {
  like: {
    label: "Like",
    icon: Heart,
    labelClassName: "text-blue-500",
  },
  love: {
    label: "Love",
    icon: Heart,
    labelClassName: "text-pink-500",
  },
  fire: {
    label: "Fire",
    icon: Flame,
    labelClassName: "text-orange-500",
  },
};

function formatAuthorName(post) {
  return post.authorId?.fullName || post.authorId?.username || "User";
}

function FeedPage() {
  const posts = useFeedStore((state) => state.posts);
  const isLoading = useFeedStore((state) => state.isLoading);
  const isSubmitting = useFeedStore((state) => state.isSubmitting);
  const loadFeed = useFeedStore((state) => state.loadFeed);
  const createPost = useFeedStore((state) => state.createPost);
  const createReply = useFeedStore((state) => state.createReply);
  const toggleReaction = useFeedStore((state) => state.toggleReaction);

  const [draft, setDraft] = useState("");
  const [replyDrafts, setReplyDrafts] = useState({});
  const [openReplyFor, setOpenReplyFor] = useState({});

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleCreatePost = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const didCreate = await createPost(trimmed);
    if (didCreate) setDraft("");
  };

  const handleCreateReply = async (postId) => {
    const trimmed = (replyDrafts[postId] || "").trim();
    if (!trimmed) return;
    const didReply = await createReply(postId, trimmed);
    if (didReply) {
      setReplyDrafts((prev) => ({ ...prev, [postId]: "" }));
      setOpenReplyFor((prev) => ({ ...prev, [postId]: false }));
    }
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="border-b border-border bg-background/90 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground">
            <ArrowLeft className="size-4" />
            Back to chat
          </Link>
          <h1 className="text-lg font-semibold">Community feed</h1>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-6">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Share a quick update with the community"
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">{draft.trim().length}/2000</span>
            <button
              onClick={handleCreatePost}
              disabled={isSubmitting || draft.trim().length === 0}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Share post
            </button>
          </div>
        </section>

        {isLoading ? (
          <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            Loading feed…
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No posts yet. Be the first to share something with the community.
          </div>
        ) : (
          posts.map((post) => {
            const counts = { like: 0, love: 0, fire: 0 };
            post.reactions?.forEach((reaction) => {
              if (reaction.kind in counts) counts[reaction.kind] += 1;
            });
            const hasReplyOpen = Boolean(openReplyFor[post._id]);

            return (
              <article key={post._id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{formatAuthorName(post)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(post.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground/90">
                  {post.body}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {Object.entries(reactionStyles).map(([kind, config]) => (
                    <button
                      key={kind}
                      onClick={() => toggleReaction(post._id, kind, "post")}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-medium transition ${
                        counts[kind] > 0 ? "border-border bg-background" : "border-border bg-transparent"
                      }`}
                    >
                      <config.icon className={`size-3.5 ${config.labelClassName}`} />
                      <span>{config.label}</span>
                      <span className="text-muted-foreground">{counts[kind]}</span>
                    </button>
                  ))}

                  <button
                    onClick={() => setOpenReplyFor((prev) => ({ ...prev, [post._id]: !hasReplyOpen }))}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-transparent px-2.5 py-1.5 text-xs font-medium text-foreground/80"
                  >
                    <MessageCircle className="size-3.5" />
                    Reply
                    <span className="text-muted-foreground">{post.replyCount || 0}</span>
                  </button>
                </div>

                {hasReplyOpen ? (
                  <div className="mt-4 space-y-3">
                    <textarea
                      value={replyDrafts[post._id] || ""}
                      onChange={(event) =>
                        setReplyDrafts((prev) => ({ ...prev, [post._id]: event.target.value }))
                      }
                      rows={3}
                      maxLength={1000}
                      placeholder="Write a reply"
                      className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleCreateReply(post._id)}
                        disabled={isSubmitting || (replyDrafts[post._id] || "").trim().length === 0}
                        className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Post reply
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </main>
    </div>
  );
}

export default FeedPage;
