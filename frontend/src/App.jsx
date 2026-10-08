import { WallpaperProvider } from "./context/WallpaperContext";
import { ThemeProvider } from "./context/ThemeContext";
import { Navigate, Route, Routes } from "react-router";
import { useAuth } from "@clerk/react";
import PageLoader from "./components/PageLoader";
import { useAuthStore } from "./store/useAuthStore";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Button, Input, TextArea } from "@heroui/react";
import { ImagePlus } from "lucide-react";
import toast from "react-hot-toast";

import { Toaster } from "react-hot-toast";

const ChatPage = lazy(() => import("./pages/ChatPage"));
const FeedPage = lazy(() => import("./pages/FeedPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));

function ProfileSetupScreen() {
  const authUser = useAuthStore((state) => state.authUser);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const uploadProfilePicture = useAuthStore((state) => state.uploadProfilePicture);
  const isUploadingProfilePicture = useAuthStore((state) => state.isUploadingProfilePicture);
  const [username, setUsername] = useState(authUser?.username || "");
  const [bio, setBio] = useState(authUser?.bio || "");
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handlePictureSelection = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile pictures must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }
    setProfilePictureFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    const trimmedUsername = username.trim();
    const trimmedBio = bio.trim();

    if (!trimmedUsername || !trimmedBio || (!profilePictureFile && !authUser?.profilePic)) {
      toast.error("Username, bio, and profile picture are required before you can continue.");
      return;
    }

    setIsSaving(true);
    let profilePic = authUser?.profilePic;
    if (profilePictureFile) {
      profilePic = await uploadProfilePicture(profilePictureFile);
      if (!profilePic) {
        setIsSaving(false);
        return;
      }
    }

    const didUpdate = await updateProfile({
      username: trimmedUsername,
      bio: trimmedBio,
      profilePic,
    });
    setIsSaving(false);

    if (didUpdate) {
      window.location.reload();
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4 text-foreground">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-surface/80 p-6 shadow-2xl backdrop-blur-sm">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-accent">Complete your profile</p>
          <h1 className="mt-2 text-3xl font-bold">Set up your account</h1>
        </div>

        <div className="mb-5 flex items-center gap-4 rounded-2xl border border-border bg-background/60 p-3">
          <img
            src={previewUrl || authUser?.profilePic || "https://placehold.co/80x80/1f2937/ffffff?text=You"}
            alt="Profile preview"
            className="h-14 w-14 rounded-full object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold">{authUser?.fullName || "New user"}</p>
            <p className="truncate text-sm text-muted">Your Clerk account is connected. Add your app identity below.</p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handlePictureSelection}
        />

        <div className="space-y-4">
          <Input
            label="Username"
            placeholder="jane_doe"
            value={username}
            onValueChange={setUsername}
            maxLength={20}
            isRequired
          />

          <TextArea
            label="Bio"
            placeholder="Tell people a bit about yourself"
            value={bio}
            onValueChange={setBio}
            minRows={3}
            maxLength={160}
            isRequired
          />

          <Button
            variant="secondary"
            className="w-full"
            onPress={() => fileInputRef.current?.click()}
            isDisabled={isSaving || isUploadingProfilePicture}
          >
            <ImagePlus className="size-4" />
            {profilePictureFile?.name || "Choose profile picture"}
          </Button>

          <Button
            color="primary"
            className="w-full"
            onPress={handleSubmit}
            isLoading={isSaving || isUploadingProfilePicture}
          >
            Continue to chat
          </Button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const { isSignedIn, isLoaded } = useAuth();

  const clearAuth = useAuthStore((state) => state.clearAuth);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isCheckingAuth = useAuthStore((state) => state.isCheckingAuth);
  const authUser = useAuthStore((state) => state.authUser);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) checkAuth();
    else clearAuth();
  }, [checkAuth, clearAuth, isLoaded, isSignedIn]);

  const profileNeedsSetup = Boolean(
    isSignedIn &&
      authUser &&
      (authUser.profileSetupRequired || !authUser.username || !authUser.bio || !authUser.profilePic),
  );

  if (!isLoaded || (isSignedIn && isCheckingAuth)) return <PageLoader />;

  return (
    <ThemeProvider>
      <WallpaperProvider>
        {profileNeedsSetup ? (
          <ProfileSetupScreen />
        ) : (
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={isSignedIn ? <ChatPage /> : <Navigate to={"/auth"} replace />} />
              <Route path="/feed" element={isSignedIn ? <FeedPage /> : <Navigate to={"/auth"} replace />} />
              <Route
                path="/auth"
                element={!isSignedIn ? <AuthPage /> : <Navigate to={"/"} replace />}
              />
            </Routes>
          </Suspense>
        )}
        <Toaster />
      </WallpaperProvider>
    </ThemeProvider>
  );
}

export default App;
