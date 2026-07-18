import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useUser } from './UserContext';

const WebSocketContext = createContext();

export function WebSocketProvider({ children }) {
  const { userId } = useUser();
  const wsRef = useRef(null);
  const messageListenersRef = useRef([]);
  const statusListenersRef = useRef([]);
  const callListenersRef = useRef([]);
  const [incomingCall, setIncomingCall] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const ws = new WebSocket("wss://xora-production-dafa.up.railway.app/ws");
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "register", user_id: userId }));
      console.log("Global WebSocket connected as user " + userId);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WS received:', data.type);
      if (
        data.type === "message" ||
        data.type === "message_edited" ||
        data.type === "message_deleted" ||
        data.type === "group_message" ||
        data.type === "media_message" ||
        data.type === "conversation_deleted"
      ) {
        messageListenersRef.current.forEach((listener) => listener(data));
      } else if (data.type === "status_update") {
        statusListenersRef.current.forEach((listener) => listener(data));
      } else if (data.type === "view_media_result") {
        messageListenersRef.current.forEach((listener) => listener(data));
      } else if (data.type === "incoming_call") {
        setIncomingCall({ from: data.from, callType: data.call_type });
        callListenersRef.current.forEach((listener) => listener(data));
      } else if (
        data.type === "call_answered" ||
        data.type === "call_rejected" ||
        data.type === "call_ended" ||
        data.type === "call_unavailable" ||
        data.type === "webrtc_offer" ||
        data.type === "webrtc_answer" ||
        data.type === "webrtc_ice"
      ) {
        callListenersRef.current.forEach((listener) => listener(data));
      }
    };

    ws.onclose = () => {
      console.log("Global WebSocket closed");
    };

    return () => {
      ws.close();
    };
  }, [userId]);

  const sendChatMessage = (toUserId, content) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "message", to: toUserId, content }));
    }
  };

  const markMessagesRead = (fromUserId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "mark_read", from: fromUserId }));
    }
  };

  const sendEditMessage = (toUserId, messageId, content) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "edit_message", to: toUserId, message_id: messageId, content }));
    }
  };

  const sendDeleteMessage = (toUserId, messageId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "delete_message", to: toUserId, message_id: messageId }));
    }
  };

  const sendGroupMessage = (groupId, content) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "group_message", group_id: groupId, content }));
    }
  };

  const sendMediaMessage = (toUserId, mediaUrl, mediaType, viewLimit) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "media_message", to: toUserId, media_url: mediaUrl, media_type: mediaType, view_limit: viewLimit }));
    }
  };

  const requestViewMedia = (messageId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "view_media", message_id: messageId }));
    }
  };

  const sendDeleteConversation = (otherUserId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "delete_conversation", other_user_id: otherUserId }));
    }
  };

  const sendCallOffer = (toUserId, callType = 'voice') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "call_offer", to: toUserId, call_type: callType }));
    }
  };
  const sendCallAnswer = (toUserId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "call_answer", to: toUserId }));
    }
  };
  const sendCallReject = (toUserId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "call_reject", to: toUserId }));
    }
  };
  const sendCallEnd = (toUserId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "call_end", to: toUserId }));
    }
  };
  const sendWebrtcOffer = (toUserId, sdp) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "webrtc_offer", to: toUserId, sdp }));
    }
  };
  const sendWebrtcAnswer = (toUserId, sdp) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "webrtc_answer", to: toUserId, sdp }));
    }
  };
  const sendWebrtcIce = (toUserId, candidate) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "webrtc_ice", to: toUserId, candidate }));
    }
  };

  const addMessageListener = (l) => messageListenersRef.current.push(l);
  const removeMessageListener = (l) => { messageListenersRef.current = messageListenersRef.current.filter((x) => x !== l); };
  const addStatusListener = (l) => statusListenersRef.current.push(l);
  const removeStatusListener = (l) => { statusListenersRef.current = statusListenersRef.current.filter((x) => x !== l); };
  const addCallListener = (l) => callListenersRef.current.push(l);
  const removeCallListener = (l) => { callListenersRef.current = callListenersRef.current.filter((x) => x !== l); };

  return (
    <WebSocketContext.Provider value={{
      sendChatMessage, markMessagesRead,
      addMessageListener, removeMessageListener,
      addStatusListener, removeStatusListener,
      sendEditMessage, sendDeleteMessage,
      sendGroupMessage, sendMediaMessage, requestViewMedia,
      sendCallOffer, sendCallAnswer, sendCallReject, sendCallEnd,
      sendWebrtcOffer, sendWebrtcAnswer, sendWebrtcIce,
      addCallListener, removeCallListener,
      incomingCall, setIncomingCall,
      sendDeleteConversation,
    }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  return useContext(WebSocketContext);
}