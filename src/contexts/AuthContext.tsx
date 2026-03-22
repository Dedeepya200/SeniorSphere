import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

type AppRole = "senior" | "family_member" | "moderator" | "admin";

interface ProfileData {
  display_name: string;
  community: string;
  community_id: string | null;
}

const rolePriority: AppRole[] = ["moderator", "family_member", "senior"];

interface AuthContextType {
  user: User | null;
  profile: ProfileData | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const hydrateModeratorCommunity = async (userId: string, profileData: ProfileData, userMeta?: Record<string, any>) => {
    if (profileData.community_id) return profileData;

    const { data: communityData } = await supabase
      .from("communities")
      .select("id, name")
      .eq("moderator_id", userId)
      .maybeSingle();

    if (!communityData) return profileData;

    const nextProfile = {
      ...profileData,
      community_id: communityData.id,
      community: communityData.name || profileData.community || userMeta?.community || "",
    };

    await supabase
      .from("profiles")
      .update({
        community_id: nextProfile.community_id,
        community: nextProfile.community,
      })
      .eq("user_id", userId);

    return nextProfile;
  };

  const fetchUserData = async (userId: string, userMeta?: Record<string, any>) => {
    const [profileRes, roleRes] = await Promise.all([
      supabase.from("profiles").select("display_name, community, community_id").eq("user_id", userId).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    const roles = ((roleRes.data as Array<{ role: AppRole }> | null) || []).map((entry) => entry.role);
    const email = userMeta?.email;
    const metadataRole = userMeta?.role as AppRole | undefined;

    let resolvedRole: AppRole | null = null;

    if (email === "admin@seniorsphere.com") {
      resolvedRole = "admin";
    } else if (roles.includes("moderator") || metadataRole === "moderator") {
      resolvedRole = "moderator";
    } else if (roles.includes("family_member") || metadataRole === "family_member") {
      resolvedRole = "family_member";
    } else if (roles.includes("senior") || metadataRole === "senior") {
      resolvedRole = "senior";
    }

    if (profileRes.data) {
      const p = profileRes.data as ProfileData;
      if (!p.community_id && userMeta?.community_id) {
        await supabase.from("profiles").update({
          community_id: userMeta.community_id,
          community: userMeta.community || p.community,
        }).eq("user_id", userId);
        p.community_id = userMeta.community_id;
        if (userMeta.community) p.community = userMeta.community;
      }

      const hydratedProfile =
        resolvedRole === "moderator"
          ? await hydrateModeratorCommunity(userId, p, userMeta)
          : p;

      setProfile(hydratedProfile);
    }

    setRole(resolvedRole);
  };

  const refreshProfile = async () => {
    if (user) await fetchUserData(user.id);
  };

  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchUserData(currentUser.id, {
          ...currentUser.user_metadata,
          email: currentUser.email,
        }).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes (do NOT await inside callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchUserData(currentUser.id, {
          ...currentUser.user_metadata,
          email: currentUser.email,
        });
      } else {
        setProfile(null);
        setRole(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
