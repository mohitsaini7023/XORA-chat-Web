import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { verifyOtp, loginUser } from "../../services/api";
import { useUser } from "../../context/UserContext";

export default function OtpVerifyScreen() {
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const phone = searchParams.get("phone");
  const { setUserId, setUsername } = useUser();

  const handleVerify = async () => {
    if (otp.length < 6) return alert("Please enter the 6-digit OTP");

    try {
      setVerifying(true);
      const verifyResult = await verifyOtp(phone, otp);

      if (!verifyResult.success) {
        setVerifying(false);
        alert(verifyResult.message || "Invalid OTP");
        return;
      }

      const result = await loginUser(phone);
      setVerifying(false);

      if (result.success) {
        setUserId(result.user_id);
        setUsername(result.username);
        navigate("/home", { replace: true });
      } else {
        navigate(`/auth/profile-setup?phone=${encodeURIComponent(phone)}`);
      }
    } catch (err) {
      setVerifying(false);
      alert("Verification failed: " + err.message);
    }
  };

  const handleOtpChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(digitsOnly);
  };

  const isComplete = otp.length === 6;

  return (
    <div style={styles.container}>
      <button style={styles.backBtn} onClick={() => navigate(-1)} aria-label="Go back">
        <ArrowLeft size={22} color="#212121" />
      </button>

      <div style={styles.iconWrap}>
        <ShieldCheck size={30} color="#D99000" />
      </div>

      <h1 style={styles.title}>Verify your number</h1>
      <p style={styles.subtitle}>
        Enter the 6-digit code sent to
        <br />
        <span style={styles.phoneText}>+91 {phone}</span>
      </p>

      <input
        style={styles.input}
        type="text"
        inputMode="numeric"
        placeholder="• • • • • •"
        value={otp}
        onChange={handleOtpChange}
        maxLength={6}
        autoFocus
      />

      <div style={{ flex: 1 }} />

      <button
        style={{
          ...styles.button,
          ...(isComplete ? styles.buttonActive : styles.buttonDisabled),
        }}
        onClick={handleVerify}
        disabled={otp.length < 6 || verifying}
      >
        <span
          style={{
            ...styles.buttonText,
            ...(isComplete ? styles.buttonTextActive : styles.buttonTextDisabled),
          }}
        >
          {verifying ? "Verifying..." : "Verify"}
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
  phoneText: {
    color: "#212121",
    fontWeight: 600,
  },
  input: {
    backgroundColor: "#FFFFFF",
    border: "1px solid #F0E6C8",
    borderRadius: 14,
    paddingTop: 18,
    paddingBottom: 18,
    fontSize: 26,
    letterSpacing: 12,
    textAlign: "center",
    color: "#212121",
    marginBottom: 20,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
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