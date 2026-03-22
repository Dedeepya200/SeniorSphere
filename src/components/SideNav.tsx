import { NavLink, useLocation } from "react-router-dom";
import { Home, Users, Calendar, Lightbulb, MessageCircle, MessageSquare, User, Shield, Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const SideNav = () => {
  const location = useLocation();
  const { role } = useAuth();
  const { t } = useLanguage();

  if (location.pathname === "/login" || location.pathname === "/signup") return null;

  const seniorNav = [
    { to: "/dashboard", icon: Home, label: t("nav.home") },
    { to: "/community", icon: Users, label: t("nav.community") },
    { to: "/events", icon: Calendar, label: t("nav.events") },
    { to: "/skills", icon: Lightbulb, label: t("nav.skills") },
    { to: "/help", icon: MessageCircle, label: t("nav.help") },
    { to: "/messages", icon: MessageSquare, label: "Messages" },
    { to: "/profile", icon: User, label: t("nav.profile") },
  ];

  const familyNav = [
    { to: "/dashboard", icon: Home, label: t("nav.dashboard") },
    { to: "/community", icon: Users, label: t("nav.community") },
    { to: "/help", icon: MessageCircle, label: t("nav.help") },
    { to: "/profile", icon: User, label: t("nav.profile") },
  ];

  const moderatorNav = [
    { to: "/dashboard", icon: Shield, label: t("nav.dashboard") },
    { to: "/help", icon: MessageCircle, label: t("nav.helpRequests") },
    { to: "/community", icon: Users, label: t("nav.community") },
    { to: "/events", icon: Calendar, label: t("nav.events") },
    { to: "/skills", icon: Lightbulb, label: t("nav.skills") },
    { to: "/profile", icon: User, label: t("nav.profile") },
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
    <nav className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-card p-4 gap-1">
      {navItems.map(({ to, icon: Icon, label }) => {
        const isActive = location.pathname === to;
        return (
          <NavLink
            key={to + label}
            to={to}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-senior-base font-semibold transition-colors ${
              isActive
                ? "bg-accent text-primary"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            <span>{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

export default SideNav;
