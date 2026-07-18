import { Phone, Globe, Lock, ChevronDown, MoreVertical } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function WelcomeScreen() {
    const navigate = useNavigate();

    const onContinue = () => {
        navigate("/login"); 
    };
    return (
        <div style={styles.container}>
            <button style={styles.menuDots} aria-label="More options">
                <MoreVertical size={22} color="#212121" />
            </button>

            <div style={styles.illustrationWrap}>
                <div style={styles.iconCluster}>
                    <div style={{ ...styles.bubbleShape, ...styles.bubbleWhite }}>
                        <Phone size={26} color="#D99000" />
                    </div>
                    <div style={{ ...styles.bubbleShape, ...styles.bubbleGold }}>
                        <Globe size={26} color="#fff" />
                    </div>
                    <div style={{ ...styles.bubbleShape, ...styles.bubbleLight }}>
                        <div style={styles.chatLines}>
                            <div style={styles.chatLine} />
                            <div style={{ ...styles.chatLine, width: 30 }} />
                        </div>
                    </div>
                    <div style={styles.lockBadge}>
                        <Lock size={16} color="#fff" />
                    </div>
                </div>
            </div>

            <div style={styles.bottomSection}>
                <p style={styles.logo}>XORA</p>
                <h1 style={styles.title}>Welcome to XORA</h1>
                <p style={styles.subtitle}>
                    Read our <span style={styles.link}>Privacy Policy</span>. Tap
                    "Agree and continue" <br />
                    to accept the <span style={styles.link}>Terms of Service</span>.
                </p>

                <button style={styles.languageSelector}>
                    <Globe size={18} color="#424242" style={{ marginRight: 8 }} />
                    <span style={styles.languageText}>English</span>
                    <ChevronDown size={16} color="#424242" style={{ marginLeft: 6 }} />
                </button>

                <button style={styles.button} onClick={onContinue}>
                    Agree and continue
                </button>
            </div>
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
        fontFamily: "system-ui, -apple-system, sans-serif",
        position: "relative",
        boxSizing: "border-box",
    },
    menuDots: {
        position: "absolute",
        top: 50,
        right: 20,
        zIndex: 2,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 4,
    },
    illustrationWrap: {
        flex: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    },
    iconCluster: {
        width: 220,
        height: 220,
        position: "relative",
    },
    bubbleShape: {
        position: "absolute",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 20,
    },
    bubbleWhite: {
        width: 90,
        height: 90,
        backgroundColor: "#FFF8E6",
        top: 10,
        left: 20,
        borderTopLeftRadius: 4,
        border: "1px solid #FFD54F",
    },
    bubbleGold: {
        width: 70,
        height: 70,
        backgroundColor: "#F4B400",
        top: 0,
        right: 10,
        borderRadius: 35,
    },
    bubbleLight: {
        width: 130,
        height: 90,
        backgroundColor: "#FFF8E6",
        bottom: 20,
        left: 30,
        borderTopLeftRadius: 4,
        justifyContent: "center",
        alignItems: "flex-start",
        paddingLeft: 16,
        border: "1px solid #FFD54F",
    },
    chatLines: {
        display: "flex",
        flexDirection: "column",
        gap: 8,
    },
    chatLine: {
        width: 60,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#D99000",
    },
    lockBadge: {
        position: "absolute",
        bottom: 5,
        left: 130,
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: "#F4B400",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        border: "3px solid #FFFDF5",
    },
    bottomSection: {
        paddingBottom: 40,
    },
    logo: {
        fontSize: 14,
        fontWeight: 800,
        color: "#D99000",
        textAlign: "center",
        letterSpacing: 4,
        marginBottom: 8,
        marginTop: 0,
    },
    title: {
        fontSize: 26,
        fontWeight: 400,
        color: "#212121",
        textAlign: "center",
        marginBottom: 16,
        marginTop: 0,
    },
    subtitle: {
        fontSize: 13,
        color: "#757575",
        textAlign: "center",
        lineHeight: "20px",
        marginBottom: 24,
    },
    link: {
        color: "#D99000",
        fontWeight: 600,
    },
    languageSelector: {
        display: "flex",
        flexDirection: "row",
        margin: "0 auto 30px",
        alignItems: "center",
        background: "none",
        border: "none",
        cursor: "pointer",
    },
    languageText: {
        color: "#424242",
        fontSize: 14,
    },
    button: {
        width: "100%",
        backgroundColor: "#F4B400",
        paddingTop: 14,
        paddingBottom: 14,
        borderRadius: 26,
        textAlign: "center",
        color: "#212121",
        fontSize: 15,
        fontWeight: 700,
        border: "none",
        cursor: "pointer",
    },
};
