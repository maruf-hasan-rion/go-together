/**
 * Password-free projections for User rows.
 * Every response that exposes a user/host must use one of these so the
 * password hash never leaves the database layer.
 */
export const userPublicSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  bio: true,
  profilePhoto: true,
  location: true,
  interests: true,
  averageRating: true,
  totalReviews: true,
  createdAt: true,
  updatedAt: true,
} as const;
