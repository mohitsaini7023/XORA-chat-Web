import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, ChevronDown, ArrowRight } from "lucide-react";
import { sendOtp } from "../../services/api";

export default function PhoneLoginScreen() {
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();
  const isValid = phone.length >= 10;

  const handleNext = async () => {
    if (!isValid) return;
    try {
      setSending(true);
      const result = await sendOtp(phone);
      setSending(false);
      if (result.success) {
        navigate(`/otp-verify?phone=${encodeURIComponent(phone)}`);
      } else {
        alert(result.message || "Failed to send OTP");
      }
    } catch (err) {
      setSending(false);
      alert("Could not connect to server.");
    }
  };

  const handlePhoneChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(digitsOnly);
  };

  return (
    <div style={styles.container}>
      <button style={styles.backBtn} onClick={() => navigate(-1)} aria-label="Go back">
        <ArrowLeft size={22} color="#212121" />
      </button>

      <div style={styles.iconWrap}>
        <Phone size={30} color="#D99000" />
      </div>

      <h1 style={styles.title}>Enter your phone number</h1>
      <p style={styles.subtitle}>
        XORA will send an SMS to verify your number.
        <br />
        <span style={styles.link}>What's my number?</span>
      </p>

      <button style={styles.countrySelector}>
        <span style={styles.countryText}>🇮🇳  India</span>
        <ChevronDown size={16} color="#757575" />
      </button>

      <div style={styles.phoneRow}>
        <div style={styles.codeBox}>
          <span style={styles.codeText}>+91</span>
        </div>
        <input
          style={styles.phoneInput}
          type="tel"
          placeholder="Phone number"
          value={phone}
          onChange={handlePhoneChange}
          maxLength={10}
          autoFocus
        />
      </div>

      <div style={{ flex: 1 }} />

      <button
        style={{
          ...styles.button,
          ...(isValid ? styles.buttonActive : styles.buttonDisabled),
        }}
        onClick={handleNext}
        disabled={!isValid || sending}
      >
        <span
          style={{
            ...styles.buttonText,
            ...(isValid ? styles.buttonTextActive : styles.buttonTextDisabled),
          }}
        >
          {sending ? "Sending..." : "Next"}
        </span>
        {isValid && !sending && (
          <ArrowRight size={18} color="#212121" style={{ marginLeft: 6 }} />
        )}
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
    paddingLeft: 24,
    paddingRight: 24,
    paddingTop: 56,
    paddingBottom: 40,
    boxSizing: "border-box",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  backBtn: {
    width: 40,
    height: 40,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFF3D6",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    color: "#212121",
    marginBottom: 10,
    marginTop: 0,
  },
  subtitle: {
    fontSize: 14,
    color: "#757575",
    lineHeight: "21px",
    marginBottom: 36,
    marginTop: 0,
  },
  link: {
    color: "#D99000",
    fontWeight: 600,
  },
  countrySelector: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    border: "1px solid #F0E6C8",
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 14,
    paddingBottom: 14,
    marginBottom: 14,
    width: "100%",
    cursor: "pointer",
  },
  countryText: {
    color: "#212121",
    fontSize: 15,
    fontWeight: 500,
  },
  phoneRow: {
    display: "flex",
    flexDirection: "row",
    gap: 10,
  },
  codeBox: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #F0E6C8",
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 14,
    paddingBottom: 14,
    display: "flex",
    justifyContent: "center",
    width: 72,
    boxSizing: "border-box",
  },
  codeText: {
    color: "#212121",
    fontSize: 16,
    fontWeight: 600,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    border: "1px solid #F0E6C8",
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 16,
    color: "#212121",
    outline: "none",
    boxSizing: "border-box",
  },
  button: {
    display: "flex",
    flexDirection: "row",
    paddingTop: 16,
    paddingBottom: 16,
    borderRadius: 28,
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
