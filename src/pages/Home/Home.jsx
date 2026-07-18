import React, { useState } from "react";
import { MessageCircle } from "lucide-react";
import ChatsScreen from "../chats/Chats";
import ChatScreen from "../chat/Chat";
import "./home.css";

export const Home = () => {
  const [selectedUser, setSelectedUser] = useState(null);

  return (
    <div className="home">
      <ChatsScreen
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
      />

      <div className="chat-section">
        {selectedUser ? (
          <ChatScreen
            key={selectedUser.user_id}
            user={selectedUser}
            onBack={() => setSelectedUser(null)}
            onSelectUser={setSelectedUser}
          />
        ) : (
          <div className="empty-chat">
            <div className="empty-chat-icon">
              <MessageCircle size={48} color="#D99000" />
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