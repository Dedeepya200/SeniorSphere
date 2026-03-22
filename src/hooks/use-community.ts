import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the logged-in user's community_id from their profile.
 * Use this to scope all data queries and inserts to the user's community.
 */
export const useCommunity = () => {
  const { profile } = useAuth();
  return profile?.community_id ?? null;
};
