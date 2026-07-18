import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, MessageCircle, Users, Plus } from "lucide-react";
import {
  getConversations,
  lookupByPhone,
  hideConversation,
  getUserGroups,
} from "../../services/api";
import { useUser } from "../../context/UserContext";
import { useWebSocketContext } from "../../context/WebSocketContext";

export default function ChatsScreen({ selectedUser, setSelectedUser }) {
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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

  // Inside Home (WhatsApp-Web layout) this just sets the selected user in
  // the right-hand pane. When Chats is used standalone (its own /chats
  // route, no selectedUser wiring passed in), it falls back to navigation.
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

  const filteredList = searchQuery.trim()
    ? combinedList.filter((item) => {
        const query = searchQuery.trim().toLowerCase();
        if (item.isGroup) {
          return item.name.toLowerCase().includes(query);
        }
        return (
          item.username.toLowerCase().includes(query) ||
          (item.phone_number && item.phone_number.includes(query))
        );
      })
    : combinedList;

  if (loading) {
    return (
      <div style={styles.centered}>
        <div style={styles.spinner} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.searchBar}>
        <Search size={18} color="#a89f8c" style={{ marginRight: 8, flexShrink: 0 }} />
        <input
          style={styles.searchInput}
          placeholder="Search by name or number"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery.length > 0 && (
          <button style={styles.iconBtn} onClick={() => setSearchQuery("")} aria-label="Clear search">
            <X size={18} color="#a89f8c" />
          </button>
        )}
      </div>

      {filteredList.length === 0 ? (
        <div style={styles.centered}>
          <div style={styles.emptyIconWrap}>
            <MessageCircle size={40} color="#D99000" />
          </div>
          <p style={styles.emptyText}>{searchQuery ? "No results found" : "No chats yet"}</p>
          <p style={styles.emptySubText}>
            {searchQuery ? "Try a different search" : "Tap + to start a conversation"}
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
                  <div style={{ ...styles.avatar, backgroundColor: "#D99000" }}>
                    <Users size={22} color="#fff" />
                  </div>
                  <div style={styles.chatInfo}>
                    <p style={styles.chatName}>{item.name}</p>
                    <p style={styles.chatMessage}>{item.last_message}</p>
                  </div>
                </button>
              );
            }

            const hasUnread = item.unread_count > 0;
            const isActive = String(selectedUser?.user_id) === String(item.user_id);
            return (
              <button
                key={item.id}
                style={{
                  ...styles.chatItem,
                  ...(hasUnread ? styles.chatItemUnread : {}),
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
                  <p style={{ ...styles.chatName, ...(hasUnread ? styles.chatNameUnread : {}) }}>
                    {item.username}
                  </p>
                  <p
                    style={{
                      ...styles.chatMessage,
                      ...(hasUnread ? styles.chatMessageUnread : {}),
                    }}
                  >
                    {item.last_message}
                  </p>
                </div>
                {hasUnread && (
                  <div style={styles.unreadBadge}>
                    <span style={styles.unreadBadgeText}>{item.unread_count}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      <button style={styles.fab} onClick={() => setModalVisible(true)} aria-label="New chat">
        <Plus size={24} color="#212121" />
      </button>

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
              <Users size={16} color="#D99000" style={{ marginRight: 6 }} />
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
    width: 340,
    flexShrink: 0,
    backgroundColor: "#FFFDF5",
    position: "relative",
    fontFamily: "system-ui, -apple-system, sans-serif",
    overflow: "hidden",
  },
  searchBar: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginLeft: 12,
    marginRight: 12,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 14,
    paddingTop: 10,
    paddingBottom: 10,
    border: "1px solid #F0E6C8",
    boxSizing: "border-box",
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#212121",
    border: "none",
    outline: "none",
    backgroundColor: "transparent",
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
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
    border: "4px solid #FFE9B3",
    borderTopColor: "#F4B400",
    animation: "chats-spin 0.8s linear infinite",
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF8E6",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyText: { fontSize: 16, color: "#212121", fontWeight: 600, margin: 0 },
  emptySubText: { fontSize: 13, color: "#757575", marginTop: 6 },
  list: {
    display: "flex",
    flexDirection: "column",
    paddingTop: 6,
    paddingBottom: 6,
    overflowY: "auto",
    flex: 1,
    minHeight: 0,
  },
  chatItem: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginLeft: 8,
    marginRight: 8,
    marginTop: 4,
    marginBottom: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    boxShadow: "0 2px 6px rgba(217, 144, 0, 0.08)",
    border: "none",
    textAlign: "left",
    cursor: "pointer",
    width: "calc(100% - 16px)",
  },
  chatItemUnread: {
    backgroundColor: "#FFF8E6",
    border: "1px solid #FFD54F",
  },
  chatItemActive: {
    backgroundColor: "#FFECB3",
    border: "1px solid #F4B400",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F4B400",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  avatarButton: {
    display: "inline-flex",
    cursor: "pointer",
  },
  avatarText: { color: "#212121", fontSize: 20, fontWeight: "bold" },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    objectFit: "cover",
  },
  chatInfo: { flex: 1, minWidth: 0 },
  chatName: { fontSize: 16, fontWeight: 600, color: "#212121", margin: 0 },
  chatNameUnread: { fontWeight: 800 },
  chatMessage: {
    fontSize: 14,
    color: "#757575",
    marginTop: 2,
    marginBottom: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  chatMessageUnread: { color: "#8a6d00", fontWeight: 600 },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F4B400",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 6,
    paddingRight: 6,
    marginLeft: 8,
    flexShrink: 0,
  },
  unreadBadgeText: { color: "#212121", fontSize: 12, fontWeight: 700 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F4B400",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0 4px 8px rgba(217, 144, 0, 0.4)",
    border: "none",
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  modalBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    width: "85%",
    maxWidth: 360,
  },
  modalTitle: { fontSize: 17, fontWeight: 700, color: "#212121", marginBottom: 4, marginTop: 0 },
  modalSubtitle: { fontSize: 13, color: "#757575", marginBottom: 14, marginTop: 0 },
  modalInput: {
    width: "100%",
    border: "1px solid #FFD54F",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    color: "#212121",
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
  modalCancel: { color: "#757575", fontSize: 14 },
  modalStart: { color: "#D99000", fontSize: 14, fontWeight: 700 },
  newGroupBtn: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTop: "1px solid #F0E6C8",
    background: "none",
    border: "none",
    borderTopStyle: "solid",
    width: "100%",
    cursor: "pointer",
    flexShrink: 0,
  },
  newGroupText: { color: "#D99000", fontSize: 14, fontWeight: 600 },
};

if (typeof document !== "undefined" && !document.getElementById("chats-spin-style")) {
  const styleTag = document.createElement("style");
  styleTag.id = "chats-spin-style";
  styleTag.textContent = `@keyframes chats-spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(styleTag);
}