"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

interface NavLink {
  href: string;
  label: string;
  active?: boolean;
}

interface RetroNavbarProps {
  locale: string;
  userEmail?: string;
  activeLink?: string;
  voiceLabel?: string;
  links?: NavLink[];
}

export default function RetroNavbar({ locale, userEmail, activeLink, voiceLabel, links }: RetroNavbarProps) {
  const router = useRouter();
  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "??";
  const [logoutHovered, setLogoutHovered] = useState(false);

  const defaultLinks: NavLink[] = links || [
    { href: `/${locale}/dashboard`, label: "Projects" },
    { href: `/${locale}/upload`, label: "New Event" },
  ];

  async function handleLogout() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push(`/${locale}/login`);
      router.refresh();
    } catch {
      router.push(`/${locale}/login`);
    }
  }

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        height: "38px",
        paddingLeft: "16px",
        paddingRight: "16px",
        gap: "24px",
        fontSize: "13px",
        fontWeight: 500,
        borderBottomWidth: "3px",
        borderBottomStyle: "solid",
        background: "#2D6A5C",
        color: "#FFF8E7",
        borderColor: "#1F4F44",
      }}
    >
      {/* Logo */}
      <Link
        href={`/${locale}/dashboard`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontFamily: "var(--font-serif)",
          fontSize: "20px",
          color: "#FFF8E7",
          textDecoration: "none",
        }}
      >
        <img src="/logo.png" alt="AI Host" style={{ width: "24px", height: "24px", borderRadius: "4px" }} />
        AI Host
      </Link>

      {/* Nav links */}
      <div style={{ display: "flex", gap: "4px", flex: 1 }}>
        {defaultLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              paddingLeft: "12px",
              paddingRight: "12px",
              paddingTop: "4px",
              paddingBottom: "4px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: link.active || activeLink === link.label ? 700 : 500,
              textDecoration: "none",
              transition: "all 0.2s",
              color: link.active || activeLink === link.label ? "#2D6A5C" : "#FFF8E7",
              background: link.active || activeLink === link.label ? "#98E4C9" : "transparent",
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Right section */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "11px" }}>
        {voiceLabel && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#98E4C9",
                animation: "pulse-dot 2s infinite",
              }}
            />
            {voiceLabel}
          </div>
        )}
        {userEmail && (
          <>
            <span style={{ opacity: 0.8 }}>{userEmail}</span>
            <button
              onClick={handleLogout}
              onMouseEnter={() => setLogoutHovered(true)}
              onMouseLeave={() => setLogoutHovered(false)}
              style={{
                fontSize: "11px",
                paddingLeft: "8px",
                paddingRight: "8px",
                paddingTop: "2px",
                paddingBottom: "2px",
                borderRadius: "6px",
                borderWidth: "1px",
                borderStyle: "solid",
                transition: "all 0.2s",
                color: logoutHovered ? "#333" : "#FFD4B8",
                borderColor: "#FFD4B8",
                background: logoutHovered ? "#FFD4B8" : "transparent",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </>
        )}
        {userEmail && (
          <div
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              background: "#FFD4B8",
              color: "#333",
            }}
          >
            {initials}
          </div>
        )}
      </div>
    </nav>
  );
}
