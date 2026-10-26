"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface NavItem {
  href: string;
  icon: string;
  label: string;
}

interface SidebarProps {
  title: string;
  navItems: NavItem[];
  roleBadgeColor?: string;
}

export default function Sidebar({ title, navItems, roleBadgeColor }: SidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🔧</div>
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-name">CraftRelay</div>
          <div className="sidebar-logo-tagline">SIH Platform</div>
        </div>
      </div>

      {/* User info */}
      <div className="sidebar-user">
        <div
          className="sidebar-avatar"
          style={roleBadgeColor ? { background: roleBadgeColor } : undefined}
        >
          {initials}
        </div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{user?.full_name ?? "—"}</div>
          <div className="sidebar-user-role">{title}</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <div className="sidebar-section-label">Navigation</div>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link${isActive ? " active" : ""}`}
              >
                <span className="icon">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="sidebar-logout" onClick={logout}>
          <span className="icon">🚪</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}
