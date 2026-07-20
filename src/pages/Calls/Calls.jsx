import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, PhoneOutgoing, PhoneIncoming, PhoneOff } from "lucide-react";
import { getCallHistory } from "../../services/api";
import { useUser } from "../../context/UserContext";

export default function CallsScreen({id,username,callType,isOutgoing}) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userId } = useUser();
  const navigate = useNavigate();

  const loadCalls = useCallback(async () => {
    if (!userId) return;
    try {
      const result = await getCallHistory(userId);
      if (result.success) setCalls(result.calls);
    } catch (err) {
      console.log("Failed to load calls:", err);
    }
    setLoading(false);
  }, [userId]);

  // Web has no screen-focus event like expo-router's useFocusEffect, so
  // re-fetch on mount/userId change and again whenever the tab regains focus.
  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  useEffect(() => {
    const handleFocus = () => loadCalls();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadCalls]);

  const otherUserId = (item) =>
    String(item.caller_id) === String(userId) ? item.receiver_id : item.caller_id;

  const goToCall = (item) => {
    navigate(
      `/call/${otherUserId(item)}?username=${encodeURIComponent(item.username)}&isOutgoing=true`
    );
  };

  if (loading) {
    return (
      <div style={styles.centered}>
        <div style={styles.spinner} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {calls.length === 0 ? (
        <div style={styles.centered}>
          <div style={styles.emptyIconWrap}>
            <Phone size={40} color="var(--accent-dark)" />
          </div>
          <p style={styles.emptyText}>No calls yet</p>
        </div>
      ) : (
        <div style={styles.list}>
          {calls.map((item) => {
            const isOutgoing = String(item.caller_id) === String(userId);
            const isMissed = item.status === "missed" && !isOutgoing;
            const color =
              isMissed || item.status === "rejected" ? "#E53935" : "#43A047";
            const DirectionIcon = isOutgoing ? PhoneOutgoing : PhoneIncoming;

            return (
              <button
                key={item.id}
                style={styles.callItem}
                onClick={() => goToCall(item)}
              >
                <div style={styles.avatar}>
                  <span style={styles.avatarText}>
                    {item.username[0].toUpperCase()}
                  </span>
                </div>
                <div style={styles.callInfo}>
                  <p style={styles.callName}>{item.username}</p>
                  <div style={styles.callMetaRow}>
                    <DirectionIcon size={14} color={color} />
                    <span style={{ ...styles.callMeta, color }}>{item.status}</span>
                  </div>
                </div>
                <button
                  style={styles.callBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToCall(item);
                  }}
                  aria-label="Call"
                >
                  <Phone size={22} color="var(--accent-dark)" />
                </button>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "var(--bg-app)",
    fontFamily: "system-ui, -apple-system, sans-serif",
    overflowY: "auto",
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
    animation: "calls-spin 0.8s linear infinite",
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
  list: {
    display: "flex",
    flexDirection: "column",
    paddingTop: 6,
    paddingBottom: 6,
  },
  callItem: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginLeft: 8,
    marginRight: 8,
    marginTop: 4,
    marginBottom: 4,
    backgroundColor: "var(--bg-surface)",
    borderRadius: 12,
    gap: 12,
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    width: "calc(100% - 16px)",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "var(--accent)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarText: { color: "var(--text-on-accent, #212121)", fontSize: 18, fontWeight: "bold" },
  callInfo: { flex: 1, minWidth: 0 },
  callName: { fontSize: 15, fontWeight: 600, color: "var(--text-primary)", margin: 0 },
  callMetaRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  callMeta: { fontSize: 12, textTransform: "capitalize" },
  callBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
};

if (typeof document !== "undefined" && !document.getElementById("calls-spin-style")) {
  const styleTag = document.createElement("style");
  styleTag.id = "calls-spin-style";
  styleTag.textContent = `@keyframes calls-spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(styleTag);
}