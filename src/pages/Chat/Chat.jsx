import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MoreVertical,
  Send,
  PlusCircle,
  Camera,
  Image as ImageIcon,
  User,
  Search,
  ChevronRight,
  Eye,
  EyeOff,
  Infinity as InfinityIcon,
  CircleDot,
  PlayCircle,
  Check,
  CheckCheck,
  Phone,
  Video,
} from "lucide-react";
import { useWebSocketContext } from "../../context/WebSocketContext";
import { useUser } from "../../context/UserContext";
import {
  getMessagesBetween,
  getUserById,
  getConversations,
  lookupByPhone,
} from "../../services/api";

const MAX_VIDEO_BYTES = 5 * 1024 * 1024;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(",")[1];
      resolve({ dataUrl, base64 });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// user      -> passed when embedded inside Home's WhatsApp-Web layout
// onBack    -> called instead of navigate(-1) when embedded (closes the pane)
// onSelectUser -> called instead of navigating to /chat/:id when a contact
//                 bubble is tapped, so it opens in the same right-hand pane
export default function ChatScreen({ user, onBack, onSelectUser }) {
  const params = useParams();
  const id = user?.user_id ?? params.id;

  const [searchParams] = useSearchParams();
  const paramUsername = searchParams.get("username");
  const navigate = useNavigate();
  const { userId } = useUser();
  const {
    sendChatMessage,
    markMessagesRead,
    addMessageListener,
    removeMessageListener,
    addStatusListener,
    removeStatusListener,
    sendEditMessage,
    sendDeleteMessage,
    sendMediaMessage,
    requestViewMedia,
  } = useWebSocketContext();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [displayName, setDisplayName] = useState(user?.username || paramUsername || `User ${id}`);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editText, setEditText] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [attachMenuVisible, setAttachMenuVisible] = useState(false);
  const [pendingMedia, setPendingMedia] = useState(null);
  const [viewLimitModalVisible, setViewLimitModalVisible] = useState(false);
  const [viewingMedia, setViewingMedia] = useState(null);
  const [contactPickerVisible, setContactPickerVisible] = useState(false);
  const [contactList, setContactList] = useState([]);
  const [contactSearchPhone, setContactSearchPhone] = useState("");
  const [callMenuVisible, setCallMenuVisible] = useState(false);
  const [messageOptionsFor, setMessageOptionsFor] = useState(null);

  const scrollEndRef = useRef(null);
  const pendingTempIds = useRef([]);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const longPressTimer = useRef(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const result = await getUserById(id);
        if (result.success) {
          setDisplayName(result.username);
          if (result.profile_photo) setProfilePhoto(result.profile_photo);
        }
      } catch (err) {
        console.log("Failed to load user info:", err);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!userId || !id) return;
    (async () => {
      try {
        const result = await getMessagesBetween(userId, id);
        if (result.success) {
          const formatted = result.messages.map((m) => ({
            id: m.id.toString(),
            from: m.sender_id,
            content: m.content,
            status: m.status,
            mediaUrl: m.media_url,
            mediaType: m.media_type,
            viewLimit: m.view_limit,
            viewCount: m.view_count,
          }));
          setMessages(formatted);
        }
      } catch (err) {
        console.log("Failed to load history:", err);
      }
      setLoading(false);
      markMessagesRead(id);
    })();
  }, [userId, id]);

  useEffect(() => {
    const handleIncoming = (data) => {
      if (
        (data.type === "message" || data.type === "media_message") &&
        String(data.from) === String(id)
      ) {
        setMessages((prev) => [
          ...prev,
          {
            from: data.from,
            content: data.content || "",
            id: data.message_id?.toString() || Date.now().toString(),
            status: "delivered",
            mediaUrl: data.media_url,
            mediaType: data.media_type,
            viewLimit: data.view_limit,
            viewCount: 0,
          },
        ]);
        markMessagesRead(id);
      } else if (data.type === "message_edited") {
        setMessages((prev) =>
          prev.map((m) =>
            String(m.id) === String(data.message_id) ? { ...m, content: data.content } : m
          )
        );
      } else if (data.type === "message_deleted") {
        setMessages((prev) =>
          prev.map((m) =>
            String(m.id) === String(data.message_id)
              ? { ...m, content: "This message was deleted", deleted: true }
              : m
          )
        );
      } else if (data.type === "view_media_result") {
        if (data.success) {
          setViewingMedia(data.media_url);
          setMessages((prev) =>
            prev.map((m) =>
              String(m.id) === String(data.message_id)
                ? { ...m, viewCount: data.view_count }
                : m
            )
          );
        } else if (data.type === "conversation_deleted") {
          setMessages([]);
        }
      } else {
        alert(data.message || "This media has expired");
        setMessages((prev) =>
          prev.map((m) =>
            String(m.id) === String(data.message_id)
              ? { ...m, viewCount: m.viewLimit || 999 }
              : m
          )
        );
      }
    };

    const handleStatus = (data) => {
      if (data.status === "sent") {
        const tempId = pendingTempIds.current.shift();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, id: data.message_id.toString(), status: "sent" } : m
          )
        );
      } else if (data.status === "delivered") {
        setMessages((prev) =>
          prev.map((m) =>
            String(m.id) === String(data.message_id) ? { ...m, status: "delivered" } : m
          )
        );
      } else if (data.status === "read" && String(data.by) === String(id)) {
        setMessages((prev) => prev.map((m) => (m.from === userId ? { ...m, status: "read" } : m)));
      }
    };

    addMessageListener(handleIncoming);
    addStatusListener(handleStatus);

    return () => {
      removeMessageListener(handleIncoming);
      removeStatusListener(handleStatus);
    };
  }, [id, userId]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim()) return;
    const toId = parseInt(id, 10);
    const tempId = Date.now().toString();
    pendingTempIds.current.push(tempId);
    sendChatMessage(toId, text);
    setMessages((prev) => [...prev, { from: userId, content: text, id: tempId, status: "sending" }]);
    setText("");
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const openCamera = () => {
    setAttachMenuVisible(false);
    cameraInputRef.current?.click();
  };

  const openGallery = () => {
    setAttachMenuVisible(false);
    galleryInputRef.current?.click();
  };

  const handleMediaFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const isVideo = file.type.startsWith("video");

    if (isVideo) {
      if (file.size > MAX_VIDEO_BYTES) {
        alert("Video too large. Please select a video under 5MB.");
        return;
      }
      try {
        const { base64 } = await fileToBase64(file);
        setPendingMedia({ base64, type: "video" });
        setViewLimitModalVisible(true);
      } catch (err) {
        alert("Could not process video");
      }
      return;
    }

    try {
      const { base64 } = await fileToBase64(file);
      setPendingMedia({ base64, type: "image" });
      setViewLimitModalVisible(true);
    } catch (err) {
      alert("Could not process image");
    }
  };

  const openContactPicker = async () => {
    setAttachMenuVisible(false);
    setContactPickerVisible(true);
    try {
      const result = await getConversations(userId);
      if (result.success) setContactList(result.conversations);
    } catch (err) {
      console.log("Failed to load contacts:", err);
    }
  };

  const searchContactByPhone = async () => {
    if (!contactSearchPhone.trim()) return;
    try {
      const result = await lookupByPhone(contactSearchPhone.trim());
      if (result.success) {
        sendContact({ user_id: result.user_id, username: result.username });
      } else {
        alert(result.message || "User not found");
      }
    } catch (err) {
      alert("Search failed");
    }
  };

  const sendContact = (contact) => {
    setContactPickerVisible(false);
    setContactSearchPhone("");
    const toId = parseInt(id, 10);
    const contactData = JSON.stringify({ user_id: contact.user_id, username: contact.username });
    sendMediaMessage(toId, contactData, "contact", null);
    setMessages((prev) => [
      ...prev,
      {
        from: userId,
        content: "",
        id: Date.now().toString(),
        status: "sending",
        mediaUrl: contactData,
        mediaType: "contact",
        viewLimit: null,
        viewCount: 0,
      },
    ]);
  };

  // Opens a contact bubble: inside Home this switches the right-hand pane
  // to that contact via onSelectUser. Standalone, it navigates to /chat/:id.
  const openContactChat = (contact) => {
    if (onSelectUser) {
      onSelectUser(contact);
    } else {
      navigate(`/chat/${contact.user_id}?username=${encodeURIComponent(contact.username)}`);
    }
  };

  const handleMediaTap = (item) => {
    const isMine = String(item.from) === String(userId);
    if (item.mediaType === "contact") {
      try {
        const contact = JSON.parse(item.mediaUrl);
        openContactChat(contact);
      } catch (err) {}
      return;
    }
    if (isMine || !item.viewLimit) {
      navigate("/photo-viewer", { state: { photo: item.mediaUrl } });
      return;
    }
    requestViewMedia(item.id);
  };

  const startLongPress = (item) => {
    longPressTimer.current = setTimeout(() => {
      handleLongPress(item);
      longPressTimer.current = null;
    }, 550);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleLongPress = (item) => {
    if (String(item.from) !== String(userId) || item.deleted || item.mediaUrl) return;
    setMessageOptionsFor(item);
  };

  const startEditFromOptions = () => {
    if (!messageOptionsFor) return;
    setEditingMessageId(messageOptionsFor.id);
    setEditText(messageOptionsFor.content);
    setEditModalVisible(true);
    setMessageOptionsFor(null);
  };

  const deleteFromOptions = () => {
    if (!messageOptionsFor) return;
    const confirmed = window.confirm("Delete message? This will delete the message for everyone.");
    if (confirmed) {
      const toId = parseInt(id, 10);
      sendDeleteMessage(toId, messageOptionsFor.id);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageOptionsFor.id
            ? { ...m, content: "This message was deleted", deleted: true }
            : m
        )
      );
    }
    setMessageOptionsFor(null);
  };

  const saveEdit = () => {
    if (!editText.trim()) return;
    const toId = parseInt(id, 10);
    sendEditMessage(toId, editingMessageId, editText);
    setMessages((prev) =>
      prev.map((m) => (m.id === editingMessageId ? { ...m, content: editText } : m))
    );
    setEditModalVisible(false);
    setEditText("");
    setEditingMessageId(null);
  };

  const renderTicks = (status) => {
    if (status === "read") return <CheckCheck size={16} color="#4FC3F7" />;
    if (status === "delivered") return <CheckCheck size={16} color="#757575" />;
    return <Check size={16} color="#757575" />;
  };

  // Back button: inside Home this closes the right-hand pane via onBack.
  // Standalone (its own route) it just goes back in browser history.
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingLogoWrap}>
          <img src="/public/favlogo.png" alt="XORA" style={styles.loadingLogoImg} />
          <div style={styles.loadingRing} />
        </div>
        <p style={styles.loadingText}>Loading conversation...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.iconBtn} onClick={handleBack} aria-label="Go back">
          <ArrowLeft size={24} color="#212121" />
        </button>
        <button style={styles.headerCenter} onClick={() => navigate(`/user-profile/${id}`)}>
          {profilePhoto ? (
            <img src={profilePhoto} alt={displayName} style={styles.avatarImage} />
          ) : (
            <div style={styles.avatar}>
              <span style={styles.avatarText}>{displayName[0]?.toUpperCase()}</span>
            </div>
          )}
          <span style={styles.headerName}>{displayName}</span>
        </button>
        <button style={styles.iconBtn} onClick={() => setCallMenuVisible(true)} aria-label="More options">
          <MoreVertical size={22} color="#212121" />
        </button>
      </div>

      <div style={styles.chatArea}>
        {messages.map((item) => {
          const isMine = String(item.from) === String(userId);

          if (item.mediaType === "contact" && item.mediaUrl) {
            let contact = {};
            try {
              contact = JSON.parse(item.mediaUrl);
            } catch (e) {}
            return (
              <button
                key={item.id}
                onClick={() => handleMediaTap(item)}
                style={{
                  ...styles.contactBubble,
                  ...(isMine ? styles.bubbleOut : styles.bubbleIn),
                }}
              >
                <div style={styles.contactAvatar}>
                  <span style={styles.contactAvatarText}>
                    {contact.username?.[0]?.toUpperCase() || "?"}
                  </span>
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <p style={styles.contactName}>{contact.username}</p>
                  <p style={styles.contactSub}>Contact</p>
                </div>
                <ChevronRight size={18} color="#757575" />
              </button>
            );
          }

          if (item.mediaUrl !== undefined && item.mediaUrl !== null) {
            const isExpired = item.viewLimit && !isMine && item.viewCount >= item.viewLimit;
            return (
              <button
                key={item.id}
                onClick={() => !isExpired && handleMediaTap(item)}
                style={{
                  ...styles.mediaBubble,
                  ...(isMine ? styles.bubbleOut : styles.bubbleIn),
                }}
              >
                {isExpired ? (
                  <div style={styles.expiredBox}>
                    <EyeOff size={30} color="#a89f8c" />
                    <span style={styles.expiredText}>Opened</span>
                  </div>
                ) : item.viewLimit && !isMine ? (
                  <div style={styles.viewOnceBox}>
                    <Eye size={30} color="#D99000" />
                    <span style={styles.viewOnceText}>
                      {item.viewLimit === 1
                        ? "View once"
                        : `${item.viewLimit - item.viewCount} views left`}
                    </span>
                  </div>
                ) : (
                  <div>
                    {item.mediaType === "video" ? (
                      <div style={{ ...styles.mediaImage, ...styles.videoPlaceholder }}>
                        <PlayCircle size={48} color="#fff" />
                      </div>
                    ) : (
                      <img src={item.mediaUrl} alt="" style={styles.mediaImage} />
                    )}
                  </div>
                )}
                {item.viewLimit ? (
                  <div style={styles.viewBadge}>
                    {item.viewLimit === 1 ? (
                      <CircleDot size={10} color="#fff" />
                    ) : (
                      <InfinityIcon size={10} color="#fff" />
                    )}
                  </div>
                ) : null}
                {isMine && <div style={styles.tickRow}>{renderTicks(item.status)}</div>}
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onMouseDown={() => startLongPress(item)}
              onMouseUp={cancelLongPress}
              onMouseLeave={cancelLongPress}
              onTouchStart={() => startLongPress(item)}
              onTouchEnd={cancelLongPress}
              onContextMenu={(e) => {
                e.preventDefault();
                handleLongPress(item);
              }}
              style={{ ...styles.bubble, ...(isMine ? styles.bubbleOut : styles.bubbleIn) }}
            >
              <p style={{ ...styles.bubbleText, ...(item.deleted ? styles.deletedText : {}) }}>
                {item.deleted ? "🚫 This message was deleted" : item.content}
              </p>
              {isMine && !item.deleted && <div style={styles.tickRow}>{renderTicks(item.status)}</div>}
            </button>
          );
        })}
        <div ref={scrollEndRef} />
      </div>

      <div style={styles.inputBar}>
        <button style={styles.attachBtn} onClick={() => setAttachMenuVisible(true)} aria-label="Attach">
          <PlusCircle size={26} color="#D99000" />
        </button>
        <input
          style={styles.input}
          placeholder="Type a message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleInputKeyDown}
        />
        <button style={styles.sendBtn} onClick={handleSend} aria-label="Send">
          <Send size={18} color="#212121" />
        </button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handleMediaFileSelected}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: "none" }}
        onChange={handleMediaFileSelected}
      />

      {callMenuVisible && (
        <div style={styles.modalOverlay} onClick={() => setCallMenuVisible(false)}>
          <div style={styles.attachModalBox} onClick={(e) => e.stopPropagation()}>
            <button
              style={styles.attachOption}
              onClick={() => {
                setCallMenuVisible(false);
                navigate(
                  `/call/${id}?username=${encodeURIComponent(displayName)}&isOutgoing=true&callType=voice`
                );
              }}
            >
              <Phone size={22} color="#D99000" />
              <span style={styles.attachOptionText}>Voice call</span>
            </button>
            <button
              style={styles.attachOption}
              onClick={() => {
                setCallMenuVisible(false);
                navigate(
                  `/call/${id}?username=${encodeURIComponent(displayName)}&isOutgoing=true&callType=video`
                );
              }}
            >
              <Video size={22} color="#D99000" />
              <span style={styles.attachOptionText}>Video call</span>
            </button>
          </div>
        </div>
      )}

      {attachMenuVisible && (
        <div style={styles.modalOverlay} onClick={() => setAttachMenuVisible(false)}>
          <div style={styles.attachModalBox} onClick={(e) => e.stopPropagation()}>
            <button style={styles.attachOption} onClick={openCamera}>
              <Camera size={22} color="#D99000" />
              <span style={styles.attachOptionText}>Camera</span>
            </button>
            <button style={styles.attachOption} onClick={openGallery}>
              <ImageIcon size={22} color="#D99000" />
              <span style={styles.attachOptionText}>Gallery</span>
            </button>
            <button style={styles.attachOption} onClick={openContactPicker}>
              <User size={22} color="#D99000" />
              <span style={styles.attachOptionText}>Contact</span>
            </button>
          </div>
        </div>
      )}

      {messageOptionsFor && (
        <div style={styles.modalOverlay} onClick={() => setMessageOptionsFor(null)}>
          <div style={styles.attachModalBox} onClick={(e) => e.stopPropagation()}>
            <button style={styles.attachOption} onClick={startEditFromOptions}>
              <span style={styles.attachOptionText}>Edit</span>
            </button>
            <button style={styles.attachOption} onClick={deleteFromOptions}>
              <span style={{ ...styles.attachOptionText, color: "#c0392b" }}>Delete</span>
            </button>
            <button style={styles.attachOption} onClick={() => setMessageOptionsFor(null)}>
              <span style={styles.attachOptionText}>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {contactPickerVisible && (
        <div style={styles.modalOverlay}>
          <div style={styles.contactPickerBox}>
            <p style={styles.modalTitle}>Share contact</p>

            <div style={styles.contactSearchRow}>
              <input
                style={styles.contactSearchInput}
                type="tel"
                placeholder="Search by phone number"
                value={contactSearchPhone}
                onChange={(e) => setContactSearchPhone(e.target.value)}
              />
              <button style={styles.contactSearchBtn} onClick={searchContactByPhone} aria-label="Search">
                <Search size={18} color="#212121" />
              </button>
            </div>

            <p style={styles.contactListLabel}>Your chats</p>
            <div style={{ maxHeight: 260, overflowY: "auto" }}>
              {contactList.length === 0 ? (
                <p style={styles.emptySubText}>No chats yet</p>
              ) : (
                contactList.map((item) => (
                  <button
                    key={item.user_id}
                    style={styles.contactListRow}
                    onClick={() => sendContact({ user_id: item.user_id, username: item.username })}
                  >
                    <div style={styles.contactAvatar}>
                      <span style={styles.contactAvatarText}>{item.username[0].toUpperCase()}</span>
                    </div>
                    <span style={styles.contactListName}>{item.username}</span>
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => {
                setContactPickerVisible(false);
                setContactSearchPhone("");
              }}
              style={{ ...styles.plainBtn, marginTop: 10 }}
            >
              <span style={styles.modalCancel}>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {viewLimitModalVisible && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <p style={styles.modalTitle}>Who can view this?</p>
            <button style={styles.viewOptionRow} onClick={() => confirmSendMedia(1)}>
              <CircleDot size={20} color="#D99000" />
              <div style={{ marginLeft: 10, textAlign: "left" }}>
                <p style={styles.viewOptionTitle}>View once</p>
                <p style={styles.viewOptionSub}>Disappears after opening</p>
              </div>
            </button>
            <button style={styles.viewOptionRow} onClick={() => confirmSendMedia(2)}>
              <Eye size={20} color="#D99000" />
              <div style={{ marginLeft: 10, textAlign: "left" }}>
                <p style={styles.viewOptionTitle}>View twice</p>
                <p style={styles.viewOptionSub}>Disappears after 2 opens</p>
              </div>
            </button>
            <button style={styles.viewOptionRow} onClick={() => confirmSendMedia(null)}>
              <InfinityIcon size={20} color="#D99000" />
              <div style={{ marginLeft: 10, textAlign: "left" }}>
                <p style={styles.viewOptionTitle}>Unlimited</p>
                <p style={styles.viewOptionSub}>Can be viewed anytime</p>
              </div>
            </button>
            <button
              onClick={() => {
                setViewLimitModalVisible(false);
                setPendingMedia(null);
              }}
              style={{ ...styles.plainBtn, marginTop: 10 }}
            >
              <span style={styles.modalCancel}>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {viewingMedia && (
        <div style={styles.fullscreenOverlay} onClick={() => setViewingMedia(null)}>
          <img src={viewingMedia} alt="" style={styles.fullscreenImage} />
          <span style={styles.tapToClose}>Tap to close</span>
        </div>
      )}

      {editModalVisible && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <p style={styles.modalTitle}>Edit message</p>
            <textarea
              style={styles.modalInput}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              autoFocus
            />
            <div style={styles.modalButtons}>
              <button style={styles.plainBtn} onClick={() => setEditModalVisible(false)}>
                <span style={styles.modalCancel}>Cancel</span>
              </button>
              <button style={styles.plainBtn} onClick={saveEdit}>
                <span style={styles.modalSave}>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function confirmSendMedia(viewLimit) {
    if (!pendingMedia) return;
    setViewLimitModalVisible(false);
    const mimePrefix =
      pendingMedia.type === "video" ? "data:video/mp4;base64," : "data:image/jpeg;base64,";
    const mediaUrl = `${mimePrefix}${pendingMedia.base64}`;
    const toId = parseInt(id, 10);

    sendMediaMessage(toId, mediaUrl, pendingMedia.type, viewLimit);
    setMessages((prev) => [
      ...prev,
      {
        from: userId,
        content: "",
        id: Date.now().toString(),
        status: "sending",
        mediaUrl,
        mediaType: pendingMedia.type,
        viewLimit,
        viewCount: 0,
      },
    ]);
    setPendingMedia(null);
  }
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100dvh",
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#FFF8E6",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  spinner: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "4px solid #FFE9B3",
    borderTopColor: "#F4B400",
    animation: "chat-spin 0.8s linear infinite",
  },
  loadingContainer: {
    flex: 1,
    height: "100dvh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF8E6",
    gap: 18,
  },
  loadingLogoWrap: {
    position: "relative",
    width: 96,
    height: 96,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingLogo: {
    fontSize: 18,
    fontWeight: 800,
    color: "#D99000",
    letterSpacing: 3,
    animation: "chat-pulse 1.4s ease-in-out infinite",
    zIndex: 1,
  },
  loadingLogoImg: {
    width: 64,
    height: 64,
    objectFit: "contain",
    animation: "chat-pulse 1.4s ease-in-out infinite",
    zIndex: 1,
    filter: "drop-shadow(0 2px 6px rgba(217, 144, 0, 0.35))",
  },
  loadingRing: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    border: "3px solid #FFE9B3",
    borderTopColor: "#F4B400",
    borderRightColor: "#F4B400",
    animation: "chat-spin 1s linear infinite",
  },
  loadingText: {
    fontSize: 13,
    color: "#a8895a",
    fontWeight: 500,
    margin: 0,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px",
    backgroundColor: "#F4B400",
    position: "sticky",
    top: 0,
    zIndex: 999,
    flexShrink: 0,
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
  },
  headerCenter: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    textAlign: "left",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  avatarImage: { width: 36, height: 36, borderRadius: 18, objectFit: "cover" },
  avatarText: { color: "#D99000", fontWeight: "bold" },
  headerName: { color: "#212121", fontSize: 17, fontWeight: 600 },
  chatArea: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    padding: 12,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  bubble: {
    maxWidth: "75%",
    padding: 10,
    borderRadius: 8,
    marginBottom: 4,
    border: "none",
    textAlign: "left",
    cursor: "pointer",
  },
  mediaBubble: {
    maxWidth: "65%",
    padding: 4,
    borderRadius: 12,
    marginBottom: 4,
    position: "relative",
    border: "none",
    cursor: "pointer",
  },
  mediaImage: { width: 220, height: 220, borderRadius: 10, objectFit: "cover", display: "block" },
  videoPlaceholder: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  contactBubble: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "75%",
    padding: 10,
    borderRadius: 10,
    marginBottom: 4,
    gap: 10,
    border: "none",
    cursor: "pointer",
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F4B400",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  contactAvatarText: { color: "#212121", fontWeight: 700 },
  contactName: { fontSize: 14, fontWeight: 600, color: "#212121", margin: 0 },
  contactSub: { fontSize: 12, color: "#757575", margin: 0 },
  viewOnceBox: {
    width: 220,
    height: 140,
    borderRadius: 10,
    backgroundColor: "#FFF3D6",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  viewOnceText: { fontSize: 12, color: "#D99000", fontWeight: 600 },
  expiredBox: {
    width: 220,
    height: 100,
    borderRadius: 10,
    backgroundColor: "#F0EAD6",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  expiredText: { fontSize: 12, color: "#a89f8c", fontWeight: 600 },
  viewBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  bubbleOut: { backgroundColor: "#FFD54F", alignSelf: "flex-end" },
  bubbleIn: { backgroundColor: "#FFFFFF", alignSelf: "flex-start" },
  bubbleText: { fontSize: 15, color: "#212121", margin: 0 },
  deletedText: { fontStyle: "italic", color: "#8a6d00" },
  tickRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 2,
    paddingLeft: 4,
    paddingRight: 4,
  },
  inputBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 8,
    background: "#FFFDF5",
    position: "sticky",
    bottom: 0,
    zIndex: 999,
    flexShrink: 0,
  },
  attachBtn: {
    width: 34,
    height: 34,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "none",
    border: "none",
    cursor: "pointer",
  },
  input: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: "#212121",
    border: "none",
    outline: "none",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F4B400",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    border: "none",
    cursor: "pointer",
    flexShrink: 0,
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
    zIndex: 20,
  },
  attachModalBox: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 10, width: 200 },
  attachOption: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 10,
    paddingRight: 10,
    width: "100%",
    background: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
  },
  attachOptionText: { fontSize: 15, color: "#212121", fontWeight: 500 },
  contactPickerBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    width: "90%",
    maxWidth: 420,
    maxHeight: "70%",
    overflowY: "auto",
  },
  contactSearchRow: { display: "flex", flexDirection: "row", gap: 8, marginBottom: 14 },
  contactSearchInput: {
    flex: 1,
    border: "1px solid #F0E6C8",
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: "#212121",
    outline: "none",
  },
  contactSearchBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F4B400",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    border: "none",
    cursor: "pointer",
    flexShrink: 0,
  },
  contactListLabel: { fontSize: 12, color: "#757575", fontWeight: 600, marginBottom: 8 },
  contactListRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 10,
    paddingBottom: 10,
    width: "100%",
    background: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
  },
  contactListName: { fontSize: 15, color: "#212121" },
  emptySubText: { fontSize: 13, color: "#757575", textAlign: "center", marginTop: 10 },
  modalBox: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 20, width: "85%", maxWidth: 380 },
  modalTitle: { fontSize: 16, fontWeight: 700, color: "#212121", marginBottom: 12, marginTop: 0 },
  viewOptionRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 12,
    borderBottom: "1px solid #F0E6C8",
    width: "100%",
    background: "none",
    border: "none",
    borderBottomStyle: "solid",
    cursor: "pointer",
    textAlign: "left",
  },
  viewOptionTitle: { fontSize: 14, fontWeight: 600, color: "#212121", margin: 0 },
  viewOptionSub: { fontSize: 12, color: "#757575", margin: 0 },
  modalInput: {
    width: "100%",
    border: "1px solid #FFD54F",
    borderRadius: 8,
    padding: 12,
    color: "#212121",
    fontSize: 15,
    minHeight: 60,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    resize: "vertical",
  },
  modalButtons: { display: "flex", flexDirection: "row", justifyContent: "flex-end", gap: 20, marginTop: 16 },
  plainBtn: { background: "none", border: "none", cursor: "pointer", padding: 0 },
  modalCancel: { color: "#757575", fontSize: 14, textAlign: "center" },
  modalSave: { color: "#D99000", fontSize: 14, fontWeight: 700 },
  fullscreenOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 30,
    cursor: "pointer",
  },
  fullscreenImage: { width: "95%", height: "80%", objectFit: "contain" },
  tapToClose: { color: "#fff", marginTop: 20, fontSize: 13 },
};

if (typeof document !== "undefined" && !document.getElementById("chat-spin-style")) {
  const styleTag = document.createElement("style");
  styleTag.id = "chat-spin-style";
  styleTag.textContent = `
    @keyframes chat-spin { to { transform: rotate(360deg); } }
    @keyframes chat-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.55; transform: scale(0.94); }
    }
  `;
  document.head.appendChild(styleTag);
}