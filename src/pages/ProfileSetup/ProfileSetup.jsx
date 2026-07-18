import { useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { User, Camera } from "lucide-react";
import { registerUser } from "../../services/api";
import { useUser } from "../../context/UserContext";

export default function ProfileSetupScreen() {
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState(null); // base64 data URL
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const phone = searchParams.get("phone");
  const { setUserId, setUsername } = useUser();
  const fileInputRef = useRef(null);

  const pickImage = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result);
    };
    reader.readAsDataURL(file);

    e.target.value = "";
  };

  const handleDone = async () => {
    if (!name.trim()) return alert("Please enter your name");
    try {
      const result = await registerUser(phone, name, photo);
      if (result.success) {
        setUserId(result.user_id);
        setUsername(name);
        navigate("/tabs/chats", { replace: true });
      } else {
        alert(result.message || "Registration failed");
      }
    } catch (err) {
      alert("Could not connect to server.");
    }
  };

  const isValid = name.trim().length > 0;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Profile Info</h1>
      <p style={styles.subtitle}>Add your name and an optional profile photo</p>

      <div style={styles.avatarWrap} onClick={pickImage}>
        {photo ? (
          <img src={photo} alt="Profile" style={styles.avatarImage} />
        ) : (
          <div style={styles.avatar}>
            <span style={styles.avatarText}>
              {name ? name[0].toUpperCase() : "?"}
            </span>
          </div>
        )}
        <div style={styles.cameraBtn}>
          <Camera size={16} color="#212121" />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <div style={styles.inputRow}>
        <User size={20} color="#D99000" style={{ marginRight: 10, flexShrink: 0 }} />
        <input
          style={styles.input}
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>

      <div style={{ flex: 1 }} />

      <button
        style={{
          ...styles.button,
          ...(isValid ? styles.buttonActive : styles.buttonDisabled),
        }}
        onClick={handleDone}
        disabled={!isValid}
      >
        <span
          style={{
            ...styles.buttonText,
            ...(isValid ? styles.buttonTextActive : styles.buttonTextDisabled),
          }}
        >
          Done
        </span>
      </button>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    backgroundColor: "#FFFDF5",
    padding: 24,
    paddingTop: 60,
    boxSizing: "border-box",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    color: "#212121",
    marginBottom: 6,
    marginTop: 0,
  },
  subtitle: {
    fontSize: 14,
    color: "#757575",
    marginBottom: 40,
    marginTop: 0,
  },
  avatarWrap: {
    alignSelf: "center",
    marginBottom: 40,
    position: "relative",
    width: 110,
    cursor: "pointer",
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#F4B400",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    objectFit: "cover",
    display: "block",
  },
  avatarText: {
    color: "#212121",
    fontSize: 40,
    fontWeight: 700,
  },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    border: "3px solid #FFFDF5",
    boxSizing: "content-box",
  },
  inputRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    border: "1px solid #F0E6C8",
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#212121",
    paddingTop: 14,
    paddingBottom: 14,
    border: "none",
    outline: "none",
    backgroundColor: "transparent",
  },
  button: {
    paddingTop: 16,
    paddingBottom: 16,
    borderRadius: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    width: "100%",
  },
  buttonActive: {
    backgroundColor: "#F4B400",
    boxShadow: "0 4px 10px rgba(217, 144, 0, 0.4)",
    cursor: "pointer",
  },
  buttonDisabled: {
    backgroundColor: "#F0EAD6",
    cursor: "not-allowed",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 700,
  },
  buttonTextActive: {
    color: "#212121",
  },
  buttonTextDisabled: {
    color: "#c4b896",
  },
};