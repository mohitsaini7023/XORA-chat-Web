import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import ChatsScreen from "../Chats/Chats";
import ChatScreen from "../Chat/Chat";
import SettingsScreen from "../setting/setting";
import "./home.css";
import { MdOutlineChat, MdOutlinePermMedia } from "react-icons/md";
import { FaRegDotCircle, FaUsers } from "react-icons/fa";
import { BsWechat } from "react-icons/bs";
import { CiCloudRainbow } from "react-icons/ci";
import { IoSettingsOutline } from "react-icons/io5";
import { useWebSocketContext } from "../../context/WebSocketContext";
import { getUserById } from "../../services/api";
import ProfileScreen from "../Profile/Profile";

// Top group of tabs. "chats" renders the real ChatsScreen; the rest render
// a placeholder until their real screens are built — swap the `render`
// for a real component whenever one is ready, no other wiring needed.
const TOP_TABS = [
  { id: "chats", icon: MdOutlineChat, label: "Chats" },
  { id: "status", icon: FaRegDotCircle, label: "Status" },
  { id: "calls", icon: BsWechat, label: "Calls" },
  { id: "groups", icon: FaUsers, label: "Groups" },
  { id: "explore", icon: CiCloudRainbow, label: "Explore" },
];

const BOTTOM_TABS = [
  { id: "media", icon: MdOutlinePermMedia, label: "Media" },
  { id: "settings", icon: IoSettingsOutline, label: "Settings" },
];

function TabPlaceholder({ icon: Icon, label }) {
  return (
    <div className="tab-placeholder">
      <div className="tab-placeholder-icon">
        <Icon size={40} />
      </div>
      <p className="tab-placeholder-title">{label}</p>
      <p className="tab-placeholder-subtitle">This section is coming soon</p>
    </div>
  );
}

export const Home = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState("chats");
  const navigate = useNavigate();
  const { incomingCall, setIncomingCall } = useWebSocketContext();

  // WebSocketContext already sets `incomingCall` whenever an
  // "incoming_call" event arrives over the socket (see WebSocketContext.jsx).
  // Nothing was actually navigating to the call screen when that happened —
  // this effect is what makes the receiver's UI actually ring.
  useEffect(() => {
    if (!incomingCall) return;

    (async () => {
      let username = `User ${incomingCall.from}`;
      try {
        const result = await getUserById(incomingCall.from);
        if (result.success) username = result.username;
      } catch (err) {
        console.log("Failed to load caller info:", err);
      }

      navigate(
        `/call/${incomingCall.from}?username=${encodeURIComponent(username)}&callType=${incomingCall.callType || "voice"}&isOutgoing=false`
      );
      setIncomingCall(null);
    })();
  }, [incomingCall, navigate, setIncomingCall]);

  const allTabs = [...TOP_TABS, ...BOTTOM_TABS];
  const currentTab = allTabs.find((t) => t.id === activeTab);

  return (
    <div className="home">
      <div className="sidebar">
        <div>
          {TOP_TABS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              className={`sidebar-icon ${activeTab === id ? "sidebar-icon-active" : ""}`}
              onClick={() => setActiveTab(id)}
              aria-label={id}
            >
              <Icon />
            </button>
          ))}
        </div>

        <div>
          {BOTTOM_TABS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              className={`sidebar-icon ${activeTab === id ? "sidebar-icon-active" : ""}`}
              onClick={() => setActiveTab(id)}
              aria-label={id}
            >
              <Icon />
            </button>
          ))}
          <button
            className={`sidebar-icon ${activeTab === "profile" ? "sidebar-icon-active" : ""}`}
            onClick={() => setActiveTab("profile")}
            aria-label="profile"
          >
            <div className="user-avatar">
              <img src="/favlogo.png" alt="User avatar" className="user-avatar-img" />
            </div>
          </button>
        </div>
      </div>

      {activeTab === "chats" ? (
        <ChatsScreen selectedUser={selectedUser} setSelectedUser={setSelectedUser} />
      ) : activeTab === "settings" ? (
        <div className="tab-middle-column">
          <SettingsScreen />
        </div>
      ) : activeTab === "profile" ? (
        <div className="tab-middle-column">
          <ProfileScreen />
        </div>
      ) : (
        <div className="tab-middle-column">
          <TabPlaceholder icon={currentTab?.icon || MdOutlineChat} label={currentTab?.label || "Profile"} />
        </div>
      )}

      <div className="chat-section">
        {activeTab === "chats" && selectedUser ? (
          <ChatScreen
            key={selectedUser.user_id}
            user={selectedUser}
            onBack={() => setSelectedUser(null)}
            onSelectUser={setSelectedUser}
          />
        ) : (
          <div className="empty-chat">
            <div className="empty-chat-icon">
              <MessageCircle size={48} style={{ color: "var(--accent-dark)" }} />
            </div>
            <p className="empty-chat-title">Select a chat</p>
            <p className="empty-chat-subtitle">
              Choose a conversation from the list to start messaging
            </p>
          </div>
        )}
      </div>
    </div>
  );
};