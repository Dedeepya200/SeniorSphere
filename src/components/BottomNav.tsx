import { NavLink, useLocation } from "react-router-dom";
import { Home, Users, Calendar, Lightbulb, MessageCircle, MessageSquare, Shield, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const BottomNav = () => {
  const location = useLocation();
  const { role } = useAuth();
  const { t } = useLanguage();

  if (location.pathname === "/login" || location.pathname === "/signup") return null;

  const seniorNav = [
    { to: "/dashboard", icon: Home, label: t("nav.home") },
    { to: "/events", icon: Calendar, label: t("nav.events") },
    { to: "/skills", icon: Lightbulb, label: t("nav.skills") },
    { to: "/help", icon: MessageCircle, label: t("nav.help") },
    { to: "/messages", icon: MessageSquare, label: "Messages" },
  ];

  const familyNav = [
    { to: "/dashboard", icon: Home, label: t("nav.home") },
    { to: "/community", icon: Users, label: t("nav.community") },
    { to: "/help", icon: MessageCircle, label: t("nav.help") },
    { to: "/profile", icon: User, label: t("nav.profile") },
  ];

  const moderatorNav = [
    { to: "/dashboard", icon: Shield, label: t("nav.dashboard") },
    { to: "/help", icon: MessageCircle, label: t("nav.help") },
    { to: "/community", icon: Users, label: t("nav.community") },
    { to: "/events", icon: Calendar, label: t("nav.events") },
  ];

  const adminNav = [
    { to: "/dashboard", icon: Shield, label: t("nav.dashboard") },
    { to: "/profile", icon: User, label: t("nav.profile") },
  ];

  const navItems =
    role === "admin"
      ? adminNav
      : role === "family_member"
        ? familyNav
        : role === "moderator"
          ? moderatorNav
          : seniorNav;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card">
      <div className="flex items-center justify-around py-2">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to + label}
              to={to}
              className={`flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-senior-sm transition-colors ${
                isActive
                  ? "bg-accent text-primary font-bold"
                  : "text-muted-foreground"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-xs font-semibold">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
