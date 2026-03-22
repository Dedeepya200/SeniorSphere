import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Copy,
  MapPin,
  RefreshCw,
  Shield,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type CommunityRequest = {
  id: string;
  name: string;
  city: string;
  area: string;
  request_count: number;
  created_at: string;
};

type CommunityOverview = {
  id: string;
  name: string;
  city: string | null;
  area: string | null;
  member_count: number;
  moderator_id: string;
  moderator_email: string | null;
};

type ModeratorDirectoryItem = {
  user_id: string;
  email: string;
  display_name: string | null;
  community_id: string | null;
  community_name: string | null;
};

type DeleteCommunityResult = {
  deleted_community_id: string;
  deleted_community_name: string;
  retired_moderator_email: string | null;
};

const cardClass = "rounded-[28px] border border-[#d8d0c6] bg-white p-6 shadow-[0_1px_0_rgba(50,40,30,0.04)]";
const innerCardClass = "rounded-[24px] border border-[#d8d0c6] bg-white p-6";

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalCommunities, setTotalCommunities] = useState(0);
  const [requests, setRequests] = useState<CommunityRequest[]>([]);
  const [communities, setCommunities] = useState<CommunityOverview[]>([]);
  const [moderators, setModerators] = useState<ModeratorDirectoryItem[]>([]);
  const [reassigningCommunityId, setReassigningCommunityId] = useState<string | null>(null);
  const [deletingCommunityId, setDeletingCommunityId] = useState<string | null>(null);

  const loadDashboard = async () => {
    const [statsRes, requestsRes, communitiesRes, moderatorsRes] = await Promise.all([
      supabase.rpc("get_admin_dashboard_stats"),
      supabase.rpc("get_admin_community_requests"),
      supabase.rpc("get_admin_community_overview"),
      supabase.rpc("get_moderator_directory"),
    ]);

    if (statsRes.error) throw statsRes.error;
    if (requestsRes.error) throw requestsRes.error;
    if (communitiesRes.error) throw communitiesRes.error;
    if (moderatorsRes.error) throw moderatorsRes.error;

    const stats = statsRes.data?.[0];

    setRequests((requestsRes.data as CommunityRequest[]) || []);
    setCommunities((communitiesRes.data as CommunityOverview[]) || []);
    setModerators((moderatorsRes.data as ModeratorDirectoryItem[]) || []);
    setTotalUsers(stats?.total_users || 0);
    setTotalCommunities(stats?.total_communities || 0);
  };

  const refresh = async (showToast = false) => {
    try {
      setRefreshing(true);
      await loadDashboard();
      if (showToast) toast.success("Dashboard refreshed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load admin dashboard.";
      toast.error(message);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const approveRequest = async (requestId: string) => {
    try {
      const { error } = await supabase.rpc("approve_community_request", { _request_id: requestId });
      if (error) throw error;
      toast.success("Community approved and moderator created.");
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not approve request.";
      toast.error(message);
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase.rpc("reject_community_request", { _request_id: requestId });
      if (error) throw error;
      toast.success("Community request rejected.");
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not reject request.";
      toast.error(message);
    }
  };

  const reassignModerator = async (communityId: string, moderatorUserId: string) => {
    try {
      setReassigningCommunityId(communityId);
      const { error } = await supabase.rpc("reassign_community_moderator", {
        _community_id: communityId,
        _moderator_user_id: moderatorUserId,
      });
      if (error) throw error;
      toast.success("Moderator reassigned.");
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not reassign moderator.";
      toast.error(message);
    } finally {
      setReassigningCommunityId(null);
    }
  };

  const createReplacementModerator = async (communityId: string) => {
    try {
      setReassigningCommunityId(communityId);
      const { error } = await supabase.rpc("admin_replace_community_moderator", {
        _community_id: communityId,
      });
      if (error) throw error;
      toast.success("Replacement moderator created.");
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create replacement moderator.";
      toast.error(message);
    } finally {
      setReassigningCommunityId(null);
    }
  };

  const deleteCommunity = async (community: CommunityOverview) => {
    const confirmed = window.confirm(
      `Delete ${community.name}? This removes the community, its posts/events/help requests/skills, and deletes all accounts assigned to this community${community.moderator_email ? `, including moderator ${community.moderator_email}` : ""}.`,
    );

    if (!confirmed) return;

    try {
      setDeletingCommunityId(community.id);
      const { data, error } = await supabase.rpc("admin_delete_community", { _community_id: community.id });
      if (error) throw error;

      const result = (data?.[0] as DeleteCommunityResult | undefined) || null;
      const moderatorMessage = result?.retired_moderator_email
        ? ` Moderator account deleted for ${result.retired_moderator_email}.`
        : "";

      toast.success(`Deleted ${result?.deleted_community_name || community.name}.${moderatorMessage}`);
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not delete community.";
      toast.error(message);
    } finally {
      setDeletingCommunityId(null);
    }
  };

  const moderatorOptions = useMemo(() => {
    const map = new Map<string, ModeratorDirectoryItem[]>();
    communities.forEach((community) => {
      map.set(
        community.id,
        moderators.filter((moderator) => moderator.community_id === null || moderator.community_id === community.id),
      );
    });
    return map;
  }, [communities, moderators]);

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}.`);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-senior-base text-muted-foreground">Loading admin dashboard...</div>;
  }

  return (
    <div className="space-y-6 bg-[#f5f1eb] pb-8 text-[#3b2d27]">
      <section className="flex flex-col gap-4 rounded-[32px] bg-[#f5f1eb] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-5">
          <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-[#dfe3dc] text-[#3b8b72]">
            <Shield size={42} strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold tracking-[-0.03em] text-[#332721] sm:text-5xl">Admin Dashboard</h1>
            <p className="mt-2 text-lg text-[#7e7068] sm:text-xl">Manage communities, users, and platform settings</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => refresh(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 self-start rounded-2xl border border-[#d8d0c6] bg-white px-4 py-3 text-sm font-semibold text-[#5d4e47] disabled:opacity-60"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          { label: "Total Communities", value: totalCommunities, icon: MapPin, tint: "text-[#3b8b72]" },
          { label: "Total Users", value: totalUsers, icon: Users, tint: "text-[#3b8b72]" },
          { label: "Pending Requests", value: requests.length, icon: UserRound, tint: "text-[#de9a16]" },
        ].map(({ label, value, icon: Icon, tint }) => (
          <div key={label} className={cardClass}>
            <div className="flex items-center gap-6">
              <div className={`flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#efebe6] ${tint}`}>
                <Icon size={34} strokeWidth={1.8} />
              </div>
              <div>
                <p className="text-5xl font-extrabold leading-none tracking-[-0.04em]">{value}</p>
                <p className="mt-3 max-w-[10rem] text-[1.05rem] font-medium leading-tight text-[#7a6b63]">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className={cardClass}>
        <div className="mb-6 flex items-center gap-3">
          <MapPin size={30} className="text-[#3b8b72]" strokeWidth={2} />
          <div>
            <h2 className="text-2xl font-extrabold tracking-[-0.03em]">Community Requests</h2>
          </div>
        </div>

        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className={innerCardClass}>
              <p className="text-base text-[#7a6b63]">No pending community requests.</p>
            </div>
          ) : (
            requests.map((request) => {
              const eligible = request.request_count >= 5;
              return (
                <div key={request.id} className={`${innerCardClass} flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between`}>
                  <div>
                    <p className="text-2xl font-extrabold tracking-[-0.03em] text-[#332721]">{request.name}</p>
                    <p className="mt-2 text-xl text-[#7a6b63]">{request.area}, {request.city}</p>
                    <div className="mt-4 flex items-center gap-2 text-lg text-[#7a6b63]">
                      <Users size={20} />
                      <span>{request.request_count} people requested</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {eligible && (
                      <button
                        type="button"
                        onClick={() => approveRequest(request.id)}
                        className="rounded-2xl bg-[#3b8b72] px-6 py-3 text-lg font-bold text-white"
                      >
                        Approve
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => rejectRequest(request.id)}
                      className="rounded-2xl border border-[#d8d0c6] bg-white px-6 py-3 text-lg font-bold text-[#6d5f58]"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className={cardClass}>
        <div className="mb-6 flex items-center gap-3">
          <BarChart3 size={30} className="text-[#3b8b72]" strokeWidth={2} />
          <h2 className="text-2xl font-extrabold tracking-[-0.03em]">All Communities</h2>
        </div>

        <div className="space-y-4">
          {communities.map((community) => {
            const availableModerators = moderatorOptions.get(community.id) || [];
            return (
              <div key={community.id} className={innerCardClass}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="text-2xl font-extrabold tracking-[-0.03em] text-[#332721]">{community.name}</p>
                    <p className="mt-2 text-xl text-[#7a6b63]">{community.area || "No area"}, {community.city || "No city"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold text-[#6d5f58]">{community.member_count} members</p>
                    <p className="mt-2 text-sm text-[#8b7d75]">Moderator: {community.moderator_email || "Unassigned"}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#8b7d75]">
                      <CheckCircle2 size={16} className="text-[#3b8b72]" />
                      Reassign Moderator
                    </div>
                    <button
                      type="button"
                      onClick={() => createReplacementModerator(community.id)}
                      disabled={reassigningCommunityId === community.id}
                      className="rounded-2xl border border-[#d8d0c6] bg-white px-4 py-3 text-sm font-bold text-[#5d4e47] disabled:opacity-60"
                    >
                      Create Replacement Moderator
                    </button>
                  </div>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <p className="text-sm text-[#8b7d75]">Create or reassign moderators from this panel.</p>
                    <select
                      value={community.moderator_id}
                      onChange={(event) => {
                        const nextModeratorId = event.target.value;
                        if (nextModeratorId && nextModeratorId !== community.moderator_id) {
                          void reassignModerator(community.id, nextModeratorId);
                        }
                      }}
                      disabled={reassigningCommunityId === community.id}
                      className="w-full rounded-2xl border border-[#d8d0c6] bg-[#fbfaf8] px-4 py-3 text-base text-[#4c3f39] lg:max-w-md"
                    >
                      {availableModerators.map((moderator) => (
                        <option key={moderator.user_id} value={moderator.user_id}>
                          {moderator.email}
                          {moderator.community_id === null ? " (unassigned)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-3 rounded-2xl border border-[#ead7d1] bg-[#fbf4f1] p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9b5c4c]">Delete Community</p>
                      <p className="mt-2 text-sm text-[#8b7d75]">
                        This deletes the community and all user accounts assigned to it
                        {community.moderator_email ? ` for ${community.moderator_email}` : ""}.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteCommunity(community)}
                      disabled={deletingCommunityId === community.id}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#b85c38] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                    >
                      <Trash2 size={16} />
                      {deletingCommunityId === community.id ? "Deleting..." : "Delete Community"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
