import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  X,
  MessageCircle,
  Users,
  SquarePen,
  MoreVertical,
  UserPlus,
  Sun,
  Moon,
  Check,
  CheckCheck,
  Clock,
} from "lucide-react";
import {
  getConversations,
  lookupByPhone,
  hideConversation,
  getUserGroups,
} from "../../services/api";
import { useUser } from "../../context/UserContext";
import { useWebSocketContext } from "../../context/WebSocketContext";
import { useTheme } from "../../context/ThemeContext";
import { motion } from "framer-motion";
import "../../pages/Chats/chats.css"; 

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "groups", label: "Groups" },
];

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { day: "2-digit", month: "short" });
}

export default function ChatsScreen({ selectedUser, setSelectedUser }) {
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [topMenuVisible, setTopMenuVisible] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { userId } = useUser();
  const { addMessageListener, removeMessageListener, sendDeleteConversation } =
    useWebSocketContext();
  const longPressTimer = useRef(null);

  const loadAll = useCallback(async () => {
    if (!userId) return;
    try {
      const [convResult, groupResult] = await Promise.all([
        getConversations(userId),
        getUserGroups(userId),
      ]);
      if (convResult.success) setConversations(convResult.conversations);
      if (groupResult.success) setGroups(groupResult.groups);
    } catch (err) {
      console.log("Failed to load chats:", err);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const handleFocus = () => loadAll();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadAll]);

  useEffect(() => {
    const handleIncoming = () => loadAll();
    addMessageListener(handleIncoming);
    return () => removeMessageListener(handleIncoming);
  }, [userId, addMessageListener, removeMessageListener, loadAll]);

  const openChat = (userObj) => {
    if (setSelectedUser) {
      setSelectedUser(userObj);
    } else {
      navigate(`/chat/${userObj.user_id}?username=${encodeURIComponent(userObj.username)}`);
    }
  };

  const startNewChat = async () => {
    if (!newChatPhone.trim()) return;
    setSearching(true);
    try {
      const result = await lookupByPhone(newChatPhone.trim());
      setSearching(false);
      if (result.success) {
        if (String(result.user_id) === String(userId)) {
          alert("You can't start a chat with yourself");
          return;
        }
        setModalVisible(false);
        setNewChatPhone("");
        openChat({ user_id: result.user_id, username: result.username });
      } else {
        alert(result.message || "User not found");
      }
    } catch (err) {
      setSearching(false);
      alert("Could not search. Check connection.");
    }
  };

  const handleDeleteConversation = (item) => {
    const confirmed = window.confirm(
      `Delete conversation with ${item.username}? This will delete it for both of you.`
    );
    if (confirmed) {
      sendDeleteConversation(item.user_id);
      loadAll();
    }
  };

  const startLongPress = (item) => {
    longPressTimer.current = setTimeout(() => {
      handleDeleteConversation(item);
      longPressTimer.current = null;
    }, 550);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const combinedList = [
    ...groups.map((g) => ({ ...g, isGroup: true, id: `group-${g.group_id}` })),
    ...conversations.map((c) => ({ ...c, isGroup: false, id: `user-${c.user_id}` })),
  ];

  const unreadCount = conversations.filter((c) => c.unread_count > 0).length;
  const groupsCount = groups.length;

  let filteredList = combinedList;
  if (activeFilter === "unread") {
    filteredList = filteredList.filter((item) => !item.isGroup && item.unread_count > 0);
  } else if (activeFilter === "groups") {
    filteredList = filteredList.filter((item) => item.isGroup);
  }

  if (searchQuery.trim()) {
    const query = searchQuery.trim().toLowerCase();
    filteredList = filteredList.filter((item) => {
      if (item.isGroup) return item.name.toLowerCase().includes(query);
      return (
        item.username.toLowerCase().includes(query) ||
        (item.phone_number && item.phone_number.includes(query))
      );
    });
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.centered}>
          <div style={styles.spinner} />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <p className="logo-text" style={styles.headerTitle}>
          XORA
        </p>
        <div style={styles.headerIcons}>
          <button style={styles.iconBtn} onClick={() => setModalVisible(true)} aria-label="New chat">
            <SquarePen size={20} color="var(--text-primary)" />
          </button>
          <button
            style={styles.iconBtn}
            onClick={() => setTopMenuVisible(true)}
            aria-label="More options"
          >
            <MoreVertical size={20} color="var(--text-primary)" />
          </button>
        </div>
      </div>

      <div style={styles.searchBarWrap}>
        <div style={styles.searchBar}>
          <Search size={17} color="var(--text-muted)" style={{ marginRight: 8, flexShrink: 0 }} />
          <input
            style={styles.searchInput}
            placeholder="Search or start a new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery.length > 0 && (
            <button style={styles.clearBtn} onClick={() => setSearchQuery("")} aria-label="Clear search">
              <X size={16} color="var(--text-muted)" />
            </button>
          )}
        </div>
      </div>

      <div style={styles.filterRow}>
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.id;
          const count = f.id === "unread" ? unreadCount : f.id === "groups" ? groupsCount : null;
          return (
            <button
              key={f.id}
              style={{ ...styles.filterChip, ...(isActive ? styles.filterChipActive : {}) }}
              onClick={() => setActiveFilter(f.id)}
            >
              {f.label}
              {count ? ` ${count}` : ""}
            </button>
          );
        })}
        <button
          style={styles.filterAddChip}
          onClick={() => setTopMenuVisible(true)}
          aria-label="More filters"
        >
          <MoreVertical size={14} color="var(--text-secondary)" />
        </button>
      </div>

      {topMenuVisible && (
        <div style={styles.modalOverlay} onClick={() => setTopMenuVisible(false)}>
          <div style={styles.attachModalBox} onClick={(e) => e.stopPropagation()}>
            <button
              style={styles.attachOption}
              onClick={() => {
                setTopMenuVisible(false);
                setModalVisible(true);
              }}
            >
              <UserPlus size={20} color="var(--accent-dark)" />
              <span style={styles.attachOptionText}>Add contact</span>
            </button>
            <button
              style={styles.attachOption}
              onClick={() => {
                setTopMenuVisible(false);
                navigate("/group/create");
              }}
            >
              <Users size={20} color="var(--accent-dark)" />
              <span style={styles.attachOptionText}>Add group</span>
            </button>
            <button
              style={styles.attachOption}
              onClick={() => {
                toggleTheme();
                setTopMenuVisible(false);
              }}
            >
              {theme === "light" ? (
                <Moon size={20} color="var(--accent-dark)" />
              ) : (
                <Sun size={20} color="var(--accent-dark)" />
              )}
              <span style={styles.attachOptionText}>
                {theme === "light" ? "Dark theme" : "Light theme"}
              </span>
            </button>
          </div>
        </div>
      )}

      {filteredList.length === 0 ? (
        <div style={styles.centered}>
          <div style={styles.emptyIconWrap}>
            <MessageCircle size={40} color="var(--accent-dark)" />
          </div>
          <p style={styles.emptyText}>{searchQuery ? "No results found" : "No chats yet"}</p>
          <p style={styles.emptySubText}>
            {searchQuery ? "Try a different search" : "Tap the pencil icon to start a conversation"}
          </p>
        </div>
      ) : (
        <div style={styles.list}>
          {filteredList.map((item) => {
            if (item.isGroup) {
              return (
                <button
                  key={item.id}
                  style={styles.chatItem}
                  onClick={() =>
                    navigate(
                      `/group/${item.group_id}?groupName=${encodeURIComponent(item.name)}`
                    )
                  }
                >
                  <div style={{ ...styles.avatar, backgroundColor: "var(--accent-dark)" }}>
                    <Users size={22} color="#fff" />
                  </div>
                  <div style={styles.chatInfo}>
                    <div style={styles.chatTopRow}>
                      <span style={styles.chatName}>{item.name}</span>
                      {item.last_message_time && (
                        <span style={styles.chatTime}>{formatTime(item.last_message_time)}</span>
                      )}
                    </div>
                    <p style={styles.chatMessage}>{item.last_message}</p>
                  </div>
                </button>
              );
            }

            const hasUnread = item.unread_count > 0;
            const isActive = String(selectedUser?.user_id) === String(item.user_id);
            const isMine = item.last_message_from_me;
            const TickIcon =
              item.last_message_status === "sending"
                ? Clock
                : item.last_message_status === "read"
                  ? CheckCheck
                  : item.last_message_status === "delivered"
                    ? CheckCheck
                    : item.last_message_status
                      ? Check
                      : null;

            return (
              <button
                key={item.id}
                style={{
                  ...styles.chatItem,
                  ...(isActive ? styles.chatItemActive : {}),
                }}
                onClick={() => openChat({ user_id: item.user_id, username: item.username })}
                onMouseDown={() => startLongPress(item)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={() => startLongPress(item)}
                onTouchEnd={cancelLongPress}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleDeleteConversation(item);
                }}
              >
                {item.profile_photo ? (
                  <span
                    role="button"
                    tabIndex={0}
                    style={styles.avatarButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(
                        `/photo-viewer?photo=${encodeURIComponent(item.profile_photo)}&name=${encodeURIComponent(item.username)}`
                      );
                    }}
                  >
                    <img src={item.profile_photo} alt={item.username} style={styles.avatarImage} />
                  </span>
                ) : (
                  <div style={styles.avatar}>
                    <span style={styles.avatarText}>{item.username[0].toUpperCase()}</span>
                  </div>
                )}
                <div style={styles.chatInfo}>
                  <div style={styles.chatTopRow}>
                    <span style={{ ...styles.chatName, ...(hasUnread ? styles.chatNameUnread : {}) }}>
                      {item.username}
                    </span>
                    {item.last_message_time && (
                      <span
                        style={{
                          ...styles.chatTime,
                          ...(hasUnread ? styles.chatTimeUnread : {}),
                        }}
                      >
                        {formatTime(item.last_message_time)}
                      </span>
                    )}
                  </div>
                  <div style={styles.chatBottomRow}>
                    {isMine && TickIcon && (
                      <TickIcon
                        size={14}
                        color={item.last_message_status === "read" ? "#53BDEB" : "var(--text-muted)"}
                        style={{ flexShrink: 0 }}
                      />
                    )}
                    <p
                      style={{
                        ...styles.chatMessage,
                        ...(hasUnread ? styles.chatMessageUnread : {}),
                      }}
                    >
                      {item.last_message}
                    </p>
                    {hasUnread && (
                      <div style={styles.unreadBadge}>
                        <span style={styles.unreadBadgeText}>{item.unread_count}</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {modalVisible && (
        <div style={styles.modalOverlay} onClick={() => setModalVisible(false)}>
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <p style={styles.modalTitle}>Start new chat</p>
            <p style={styles.modalSubtitle}>Enter phone number</p>
            <input
              style={styles.modalInput}
              type="tel"
              placeholder="e.g. 9876543210"
              value={newChatPhone}
              onChange={(e) => setNewChatPhone(e.target.value)}
            />
            <div style={styles.modalButtons}>
              <button
                style={styles.modalCancelBtn}
                onClick={() => {
                  setModalVisible(false);
                  setNewChatPhone("");
                }}
              >
                <span style={styles.modalCancel}>Cancel</span>
              </button>
              <button style={styles.modalStartBtn} onClick={startNewChat} disabled={searching}>
                <span style={styles.modalStart}>{searching ? "Searching..." : "Start"}</span>
              </button>
            </div>
            <button
              style={styles.newGroupBtn}
              onClick={() => {
                setModalVisible(false);
                navigate("/group/create");
              }}
            >
              <Users size={16} color="var(--accent-dark)" style={{ marginRight: 6 }} />
              <span style={styles.newGroupText}>Create new group</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100dvh",
    width: 380,
    flexShrink: 0,
    backgroundColor: "var(--bg-app)",
    position: "relative",
    fontFamily: "system-ui, -apple-system, sans-serif",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 16px 8px 16px",
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#F4B400",
    margin: 0,
    letterSpacing: "2px",
    textShadow: "0 0 10px rgba(244,180,0,0.8)",
    cursor: "pointer",
  },
  headerIcons: {
    display: "flex",
    flexDirection: "row",
    gap: 4,
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
  },
  searchBarWrap: {
    padding: "4px 12px 8px 12px",
    flexShrink: 0,
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
  clearBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
  },
  filterRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: "0 12px 10px 12px",
    flexShrink: 0,
    overflowX: "auto",
  },
  filterChip: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-secondary)",
    backgroundColor: "var(--bg-hover)",
    border: "none",
    borderRadius: 16,
    padding: "6px 14px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  filterChipActive: {
    backgroundColor: "var(--accent-soft)",
    color: "var(--accent-dark)",
  },
  filterAddChip: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    backgroundColor: "var(--bg-hover)",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  centered: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  spinner: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "4px solid var(--accent-soft)",
    borderTopColor: "var(--accent)",
    animation: "chats-spin 0.8s linear infinite",
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "var(--bg-hover)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyText: { fontSize: 16, color: "var(--text-primary)", fontWeight: 600, margin: 0 },
  emptySubText: { fontSize: 13, color: "var(--text-secondary)", marginTop: 6, textAlign: "center" },
  list: {
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    flex: 1,
    minHeight: 0,
  },
  chatItem: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    padding: "10px 16px",
    backgroundColor: "transparent",
    border: "none",
    borderBottom: "1px solid var(--border-color)",
    textAlign: "left",
    cursor: "pointer",
    width: "100%",
    gap: 12,
    boxSizing: "border-box",
  },
  chatItemActive: {
    backgroundColor: "var(--bg-hover)",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "var(--accent)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarButton: {
    display: "inline-flex",
    cursor: "pointer",
    flexShrink: 0,
  },
  avatarText: { color: "var(--text-on-accent, #212121)", fontSize: 19, fontWeight: "bold" },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    objectFit: "cover",
    display: "block",
  },
  chatInfo: { flex: 1, minWidth: 0 },
  chatTopRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  chatName: {
    fontSize: 16,
    fontWeight: 500,
    color: "var(--text-primary)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  chatNameUnread: { fontWeight: 700 },
  chatTime: {
    fontSize: 12,
    color: "var(--text-secondary)",
    flexShrink: 0,
  },
  chatTimeUnread: { color: "var(--accent-dark)", fontWeight: 600 },
  chatBottomRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  chatMessage: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    color: "var(--text-secondary)",
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  chatMessageUnread: { color: "var(--text-primary)", fontWeight: 500 },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#25D366",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 6,
    paddingRight: 6,
    flexShrink: 0,
  },
  unreadBadgeText: { color: "#0b0b0b", fontSize: 12, fontWeight: 700 },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "var(--overlay)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  attachModalBox: {
    backgroundColor: "var(--bg-surface)",
    borderRadius: 14,
    padding: 10,
    width: 200,
  },
  attachOption: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: "12px 10px",
    width: "100%",
    background: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
  },
  attachOptionText: { fontSize: 15, color: "var(--text-primary)", fontWeight: 500 },
  modalBox: {
    backgroundColor: "var(--bg-surface)",
    borderRadius: 12,
    padding: 20,
    width: "85%",
    maxWidth: 360,
  },
  modalTitle: { fontSize: 17, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4, marginTop: 0 },
  modalSubtitle: { fontSize: 13, color: "var(--text-secondary)", marginBottom: 14, marginTop: 0 },
  modalInput: {
    width: "100%",
    border: "1px solid var(--border-color)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    color: "var(--text-primary)",
    backgroundColor: "var(--bg-app)",
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
  },
  modalButtons: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 20,
  },
  modalCancelBtn: { background: "none", border: "none", cursor: "pointer", padding: 0 },
  modalStartBtn: { background: "none", border: "none", cursor: "pointer", padding: 0 },
  modalCancel: { color: "var(--text-secondary)", fontSize: 14 },
  modalStart: { color: "var(--accent-dark)", fontSize: 14, fontWeight: 700 },
  newGroupBtn: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTop: "1px solid var(--border-color)",
    background: "none",
    border: "none",
    width: "100%",
    cursor: "pointer",
    flexShrink: 0,
  },
  newGroupText: { color: "var(--accent-dark)", fontSize: 14, fontWeight: 600 },
};

if (typeof document !== "undefined" && !document.getElementById("chats-spin-style")) {
  const styleTag = document.createElement("style");
  styleTag.id = "chats-spin-style";
  styleTag.textContent = `@keyframes chats-spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(styleTag);
}