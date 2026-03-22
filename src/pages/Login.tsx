import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Heart, Lock, Mail, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

type Role = "senior" | "family_member";

type Community = {
  id: string;
  name: string;
  city: string | null;
  area: string | null;
};

const Login = () => {
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  const [isSignup, setIsSignup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role>("senior");
  const [selectedCommunityId, setSelectedCommunityId] = useState("");
  const [requestingCommunity, setRequestingCommunity] = useState(false);
  const [requestedCommunityName, setRequestedCommunityName] = useState("");
  const [requestedCity, setRequestedCity] = useState("");
  const [requestedArea, setRequestedArea] = useState("");
  const [requestedNotes, setRequestedNotes] = useState("");

  useEffect(() => {
    if (!isSignup) return;

    const loadCommunities = async () => {
      const { data, error } = await supabase
        .from("communities")
        .select("id, name, city, area")
        .order("name", { ascending: true });

      if (error) {
        toast.error("Failed to load communities.");
        return;
      }

      setCommunities((data as Community[]) || []);
    };

    void loadCommunities();
  }, [isSignup]);

  const roles = useMemo(
    () => [
      { value: "senior" as const, label: t("role.senior"), desc: t("login.seniorDesc") },
      { value: "family_member" as const, label: t("role.family_member"), desc: t("login.familyDesc") },
    ],
    [t],
  );

  const resetCommunityRequest = () => {
    setRequestedCommunityName("");
    setRequestedCity("");
    setRequestedArea("");
    setRequestedNotes("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      if (isSignup) {
        const selectedCommunity = communities.find((community) => community.id === selectedCommunityId) || null;
        const isRequestValid = requestedCommunityName.trim() && requestedCity.trim() && requestedArea.trim();

        if (!selectedCommunity && !(requestingCommunity && isRequestValid)) {
          throw new Error("Select an existing community or submit a valid community request.");
        }

        const metadata: Record<string, string | boolean> = {
          display_name: displayName.trim(),
          role: selectedRole,
        };

        if (selectedCommunity) {
          metadata.community = selectedCommunity.name;
          metadata.community_id = selectedCommunity.id;
        }

        if (!selectedCommunity && requestingCommunity) {
          metadata.requested_community_name = requestedCommunityName.trim();
          metadata.requested_community_city = requestedCity.trim();
          metadata.requested_community_area = requestedArea.trim();
          if (requestedNotes.trim()) {
            metadata.requested_community_notes = requestedNotes.trim();
          }
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: metadata,
          },
        });

        if (error) throw error;

        toast.success(
          selectedCommunity
            ? "Account created. You can now log in."
            : "Account created and community request submitted.",
        );
        setIsSignup(false);
        setSelectedCommunityId("");
        setRequestingCommunity(false);
        resetCommunityRequest();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() => setLanguage(language === "en" ? "te" : "en")}
            className="rounded-lg border border-border px-3 py-2 text-sm font-bold text-muted-foreground"
          >
            {t("lang.switch")}
          </button>
        </div>

        <div className="mb-8 flex flex-col items-center">
          <Heart size={48} className="mb-3 fill-primary text-primary" />
          <h1 className="text-senior-3xl font-bold text-foreground">SeniorSphere</h1>
          <p className="mt-1 text-senior-base text-muted-foreground">{t("app.tagline")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <div className="relative">
              <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder={t("login.fullName")}
                className="w-full rounded-lg border border-input bg-card py-4 pl-12 pr-4 text-senior-base"
                required
              />
            </div>
          )}

          <div className="relative">
            <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("login.email")}
              className="w-full rounded-lg border border-input bg-card py-4 pl-12 pr-4 text-senior-base"
              required
            />
          </div>

          <div className="relative">
            <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("login.password")}
              className="w-full rounded-lg border border-input bg-card py-4 pl-12 pr-12 text-senior-base"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {isSignup && (
            <>
              <div className="space-y-2">
                <p className="text-senior-sm font-semibold text-muted-foreground">{t("login.iAm")}</p>
                {roles.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setSelectedRole(role.value)}
                    className={`w-full rounded-lg border-2 p-3 text-left transition-colors ${
                      selectedRole === role.value ? "border-primary bg-primary/10" : "border-border bg-card"
                    }`}
                  >
                    <p className="text-senior-base font-bold">{role.label}</p>
                    <p className="text-senior-sm text-muted-foreground">{role.desc}</p>
                  </button>
                ))}
              </div>

              <div className="space-y-4 rounded-lg border border-border bg-card p-4">
                <div>
                  <p className="text-senior-base font-bold text-foreground">{t("login.joinCommunity")}</p>
                  <p className="text-senior-sm text-muted-foreground">{t("login.communitySelectHelp")}</p>
                </div>

                <select
                  value={selectedCommunityId}
                  onChange={(event) => {
                    setSelectedCommunityId(event.target.value);
                    if (event.target.value) {
                      setRequestingCommunity(false);
                    }
                  }}
                  className="w-full rounded-lg border border-input bg-background px-4 py-3 text-senior-base"
                >
                  <option value="">{t("login.selectCommunity")}</option>
                  {communities.map((community) => (
                    <option key={community.id} value={community.id}>
                      {community.name} {community.area ? `- ${community.area}` : ""} {community.city ? `(${community.city})` : ""}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setRequestingCommunity((current) => !current);
                    setSelectedCommunityId("");
                  }}
                  className="w-full rounded-lg border border-dashed border-primary px-4 py-3 text-senior-sm font-semibold text-primary"
                >
                  {t("login.requestNewCommunity")}
                </button>

                {requestingCommunity && (
                  <div className="space-y-3 rounded-lg border border-border bg-background p-4">
                    <input
                      value={requestedCommunityName}
                      onChange={(event) => setRequestedCommunityName(event.target.value)}
                      placeholder={t("login.communityName")}
                      className="w-full rounded-lg border border-input bg-card px-4 py-3 text-senior-base"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        value={requestedCity}
                        onChange={(event) => setRequestedCity(event.target.value)}
                        placeholder={t("login.city")}
                        className="w-full rounded-lg border border-input bg-card px-4 py-3 text-senior-base"
                      />
                      <input
                        value={requestedArea}
                        onChange={(event) => setRequestedArea(event.target.value)}
                        placeholder={t("login.area")}
                        className="w-full rounded-lg border border-input bg-card px-4 py-3 text-senior-base"
                      />
                    </div>
                    <textarea
                      value={requestedNotes}
                      onChange={(event) => setRequestedNotes(event.target.value)}
                      placeholder={t("login.additionalNotes")}
                      className="min-h-28 w-full rounded-lg border border-input bg-card px-4 py-3 text-senior-base"
                    />
                    <p className="text-senior-sm text-muted-foreground">{t("login.communityRequestHelp")}</p>
                  </div>
                )}
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-4 text-senior-lg font-bold text-primary-foreground disabled:opacity-50"
          >
            {loading ? t("login.pleaseWait") : isSignup ? t("login.signUp") : t("login.logIn")}
          </button>
        </form>

        <p className="mt-6 text-center text-senior-base text-muted-foreground">
          {isSignup ? t("login.alreadyAccount") : t("login.noAccount")}{" "}
          <button
            type="button"
            onClick={() => setIsSignup((current) => !current)}
            className="font-bold text-primary"
          >
            {isSignup ? t("login.logIn") : t("login.signUp")}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
