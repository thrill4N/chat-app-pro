export async function checkAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userDoc = req.user.toObject ? req.user.toObject() : req.user;
  const profileSetupRequired = !userDoc.username || !userDoc.bio || !userDoc.profilePic;

  res.status(200).json({
    ...userDoc,
    profileSetupRequired,
  });
}
