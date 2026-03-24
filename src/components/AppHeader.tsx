import { Heart, LogOut, Globe, Sun, Moon, Download } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "next-themes";
import NotificationBell from "./NotificationBell";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { toast } from "sonner";

const AppHeader = () => {
  const location = useLocation();
  const { user, role, profile, signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { canInstall, install } = usePwaInstall();

  if (location.pathname === "/login" || location.pathname === "/signup") return null;

  const roleBadge = role === "moderator" ? t("role.badge.moderator") : role === "family_member" ? t("role.badge.family") : role === "admin" ? t("role.badge.admin") : null;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md px-6 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart size={24} className="text-primary fill-primary" />
          <span className="text-senior-lg font-bold text-foreground">{t("app.name")}</span>
          {roleBadge && (
            <span className="ml-2 rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary uppercase tracking-wide">
              {roleBadge}
            </span>
          )}
        </div>
        {user && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center justify-center rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              title={t("header.toggleTheme")}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => setLanguage(language === "en" ? "te" : "en")}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              title={t("header.switchLanguage")}
            >
              <Globe size={14} />
              <span className="hidden sm:inline">{t("lang.switch")}</span>
            </button>
            {canInstall && (
              <button
                onClick={async () => {
                  const installed = await install();
                  if (!installed) {
                    toast.info(t("header.installDismissed"));
                  }
                }}
                className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
                title={t("header.installApp")}
              >
                <Download size={14} />
                <span className="hidden sm:inline">{t("header.install")}</span>
              </button>
            )}
            <NotificationBell />
            <span className="hidden sm:inline text-senior-sm text-muted-foreground">{profile?.display_name}</span>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-senior-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">{t("nav.logout")}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default AppHeader;
