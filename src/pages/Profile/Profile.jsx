import { useState, useRef } from "react";
import { Smile, Pencil, Phone, Copy, Check, Camera } from "lucide-react";
import { useUser } from "../../context/UserContext";
import { updateUserProfile } from "../../services/api";

export default function ProfileScreen() {
  const { userId, username, setUsername, profilePhoto, setProfilePhoto, phoneNumber, status, setStatus } =
    useUser();

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(username || "");
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutDraft, setAboutDraft] = useState(status || "What's happening?");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const saveProfile = async ({ newUsername, newStatus, newPhoto } = {}) => {
    setSaving(true);
    try {
      const result = await updateUserProfile(
        userId,
        newUsername ?? username,
        newStatus ?? status,
        newPhoto ?? profilePhoto
      );
      if (result.success) {
        if (newUsername !== undefined) setUsername?.(newUsername);
        if (newStatus !== undefined) setStatus?.(newStatus);
        if (newPhoto !== undefined) setProfilePhoto?.(newPhoto);
      } else {
        alert(result.message || "Could not update profile");
      }
    } catch (err) {
      alert("Could not connect to server.");
    }
    setSaving(false);
  };

  const handleSaveName = () => {
    if (!nameDraft.trim()) return;
    setEditingName(false);
    saveProfile({ newUsername: nameDraft.trim() });
  };

  const handleSaveAbout = () => {
    setEditingAbout(false);
    saveProfile({ newStatus: aboutDraft.trim() || "What's happening?" });
  };

  const handleCopyPhone = async () => {
    if (!phoneNumber) return;
    try {
      await navigator.clipboard.writeText(phoneNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.log("Clipboard copy failed:", err);
    }
  };

  const handlePickPhoto = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoSelected = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      saveProfile({ newPhoto: reader.result });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={styles.container}>
      <p style={styles.header}>Profile</p>

      <div style={styles.avatarSection}>
        <button style={styles.avatarWrap} onClick={handlePickPhoto} aria-label="Change photo">
          {profilePhoto ? (
            <img src={profilePhoto} alt={username || "Profile"} style={styles.avatarImage} />
          ) : (
            <div style={styles.avatarFallback}>
              <span style={styles.avatarFallbackText}>
                {username ? username[0].toUpperCase() : "?"}
              </span>
            </div>
          )}
          <div style={styles.avatarCameraBadge}>
            <Camera size={16} color="#fff" />
          </div>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handlePhotoSelected}
      />

      <div style={styles.section}>
        <p style={styles.sectionLabel}>About</p>
        {editingAbout ? (
          <div style={styles.editRow}>
            <Smile size={20} color="var(--accent-dark)" style={{ flexShrink: 0 }} />
            <input
              style={styles.editInput}
              value={aboutDraft}
              onChange={(e) => setAboutDraft(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSaveAbout()}
            />
            <button style={styles.iconBtn} onClick={handleSaveAbout} aria-label="Save">
              <Check size={18} color="var(--accent-dark)" />
            </button>
          </div>
        ) : (
          <div style={styles.row}>
            <Smile size={20} color="var(--accent-dark)" style={{ flexShrink: 0 }} />
            <span style={styles.rowValue}>{status || "What's happening?"}</span>
            <button
              style={styles.iconBtn}
              onClick={() => {
                setAboutDraft(status || "What's happening?");
                setEditingAbout(true);
              }}
              aria-label="Edit about"
            >
              <Pencil size={16} color="var(--text-secondary)" />
            </button>
          </div>
        )}
        <p style={styles.sectionHint}>Until I change it</p>
      </div>

      <div style={styles.section}>
        <p style={styles.sectionLabel}>Name</p>
        {editingName ? (
          <div style={styles.editRow}>
            <input
              style={styles.editInput}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
            />
            <button style={styles.iconBtn} onClick={handleSaveName} aria-label="Save">
              <Check size={18} color="var(--accent-dark)" />
            </button>
          </div>
        ) : (
          <div style={styles.row}>
            <span style={styles.rowValue}>{username || ""}</span>
            <button
              style={styles.iconBtn}
              onClick={() => {
                setNameDraft(username || "");
                setEditingName(true);
              }}
              aria-label="Edit name"
            >
              <Pencil size={16} color="var(--text-secondary)" />
            </button>
          </div>
        )}
      </div>

      <div style={styles.section}>
        <p style={styles.sectionLabel}>Phone</p>
        <div style={styles.row}>
          <Phone size={18} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
          <span style={styles.rowValue}>{phoneNumber || ""}</span>
          <button style={styles.iconBtn} onClick={handleCopyPhone} aria-label="Copy phone number">
            {copied ? (
              <Check size={16} color="var(--accent-dark)" />
            ) : (
              <Copy size={16} color="var(--text-secondary)" />
            )}
          </button>
        </div>
      </div>
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
  avatarSection: {
    display: "flex",
    justifyContent: "center",
    padding: "16px 0 24px 0",
  },
  avatarWrap: {
    position: "relative",
    width: 140,
    height: 140,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  avatarImage: {
    width: 140,
    height: 140,
    borderRadius: "50%",
    objectFit: "cover",
    display: "block",
  },
  avatarFallback: {
    width: 140,
    height: 140,
    borderRadius: "50%",
    backgroundColor: "var(--accent)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarFallbackText: {
    fontSize: 48,
    fontWeight: 700,
    color: "var(--text-on-accent, #212121)",
  },
  avatarCameraBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 34,
    height: 34,
    borderRadius: "50%",
    backgroundColor: "var(--accent-dark)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    border: "3px solid var(--bg-surface)",
  },
  section: {
    padding: "0 16px 24px 16px",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--accent-dark)",
    margin: "0 0 10px 0",
  },
  sectionHint: {
    fontSize: 12,
    color: "var(--text-muted)",
    margin: "8px 0 0 0",
  },
  row: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowValue: {
    flex: 1,
    fontSize: 16,
    color: "var(--text-primary)",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  editRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  editInput: {
    flex: 1,
    fontSize: 16,
    color: "var(--text-primary)",
    backgroundColor: "transparent",
    border: "none",
    borderBottom: "1px solid var(--accent)",
    outline: "none",
    padding: "4px 0",
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
};