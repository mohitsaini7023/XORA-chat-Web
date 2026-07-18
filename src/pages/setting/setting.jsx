import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  KeyRound,
  Lock,
  MessageSquare,
  Bell,
  Keyboard,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { useUser } from "../../context/UserContext";

const SETTINGS_ITEMS = [
  {
    id: "account",
    icon: KeyRound,
    title: "Account",
    subtitle: "Security notifications, account info",
  },
  {
    id: "privacy",
    icon: Lock,
    title: "Privacy",
    subtitle: "Blocked contacts, disappearing messages",
  },
  {
    id: "chats",
    icon: MessageSquare,
    title: "Chats",
    subtitle: "Theme, wallpaper, chat settings",
  },
  {
    id: "notifications",
    icon: Bell,
    title: "Notifications",
    subtitle: "Message notifications",
  },
  {
    id: "shortcuts",
    icon: Keyboard,
    title: "Keyboard shortcuts",
    subtitle: "Quick actions",
  },
  {
    id: "help",
    icon: HelpCircle,
    title: "Help and feedback",
    subtitle: "Help center, contact us, privacy policy",
  },
];

export default function SettingsScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const { username, profilePhoto, setUserId, setUsername } = useUser();
  const navigate = useNavigate();

  const filteredItems = searchQuery.trim()
    ? SETTINGS_ITEMS.filter((item) => {
        const query = searchQuery.trim().toLowerCase();
        return (
          item.title.toLowerCase().includes(query) ||
          item.subtitle.toLowerCase().includes(query)
        );
      })
    : SETTINGS_ITEMS;

  const handleLogout = () => {
    const confirmed = window.confirm("Are you sure you want to log out?");
    if (!confirmed) return;
    setUserId?.(null);
    setUsername?.(null);
    localStorage.removeItem("xora-user-id");
    localStorage.removeItem("xora-username");
    navigate("/", { replace: true });
  };

  return (
    <div style={styles.container}>
      <p style={styles.header}>Settings</p>

      <div style={styles.searchBarWrap}>
        <div style={styles.searchBar}>
          <Search size={17} color="var(--text-muted)" style={{ marginRight: 8, flexShrink: 0 }} />
          <input
            style={styles.searchInput}
            placeholder="Search settings"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <button style={styles.profileRow}>
        {profilePhoto ? (
          <img src={profilePhoto} alt={username || "Profile"} style={styles.avatarImage} />
        ) : (
          <div style={styles.avatar}>
            <span style={styles.avatarText}>{username ? username[0].toUpperCase() : "?"}</span>
          </div>
        )}
        <span style={styles.profileName}>{username || ""}</span>
      </button>

      <div style={styles.divider} />

      <div style={styles.list}>
        {filteredItems.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} style={styles.settingRow}>
              <div style={styles.settingIconWrap}>
                <Icon size={20} color="var(--text-secondary)" />
              </div>
              <div style={styles.settingInfo}>
                <span style={styles.settingTitle}>{item.title}</span>
                <span style={styles.settingSubtitle}>{item.subtitle}</span>
              </div>
            </button>
          );
        })}

        <button style={styles.settingRow} onClick={handleLogout}>
          <div style={styles.settingIconWrap}>
            <LogOut size={20} color="#E53935" />
          </div>
          <div style={styles.settingInfo}>
            <span style={{ ...styles.settingTitle, color: "#E53935" }}>Log out</span>
          </div>
        </button>
      </div>

      <div style={styles.divider} />
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
    backgroundColor: "var(--bg-surface)",
    fontFamily: "system-ui, -apple-system, sans-serif",
    overflowY: "auto",
    boxSizing: "border-box",
  },
  header: {
    fontSize: 24,
    fontWeight: 700,
    color: "var(--text-primary)",
    margin: 0,
    padding: "20px 16px 12px 16px",
  },
  searchBarWrap: {
    padding: "0 16px 16px 16px",
  },
  searchBar: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "var(--bg-hover)",
    borderRadius: 20,
    paddingLeft: 14,
    paddingRight: 10,
    paddingTop: 9,
    paddingBottom: 9,
    boxSizing: "border-box",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "var(--text-primary)",
    border: "none",
    outline: "none",
    backgroundColor: "transparent",
  },
  profileRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: "8px 16px 20px 16px",
    background: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    boxSizing: "border-box",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "var(--accent)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarText: { color: "var(--text-on-accent, #212121)", fontSize: 22, fontWeight: "bold" },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    objectFit: "cover",
    flexShrink: 0,
  },
  profileName: {
    fontSize: 15,
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  divider: {
    height: 1,
    backgroundColor: "var(--border-color)",
    margin: "0 16px",
    flexShrink: 0,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    padding: "8px 0",
  },
  settingRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    padding: "12px 16px",
    background: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    boxSizing: "border-box",
  },
  settingIconWrap: {
    width: 24,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  settingInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  settingSubtitle: {
    fontSize: 13,
    color: "var(--text-secondary)",
  },
};