import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Mic, MicOff, Video as VideoIcon, VideoOff, Volume2, Volume1, Phone, PhoneOff } from "lucide-react";
import { useWebSocketContext } from "../../context/WebSocketContext";
import { useUser } from "../../context/UserContext";

const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
const RINGTONE_URL = "https://actions.google.com/sounds/v1/alarms/phone_alerts_and_rings.ogg";

export default function CallScreen() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const username = searchParams.get("username");
  const isOutgoing = searchParams.get("isOutgoing");
  const paramCallType = searchParams.get("callType");
  const navigate = useNavigate();
  const { userId } = useUser();
  const {
    sendCallOffer,
    sendCallAnswer,
    sendCallReject,
    sendCallEnd,
    sendWebrtcOffer,
    sendWebrtcAnswer,
    sendWebrtcIce,
    addCallListener,
    removeCallListener,
    incomingCall,
  } = useWebSocketContext();

  const isVideoCall = paramCallType === "video" || incomingCall?.callType === "video";

  const [callStatus, setCallStatus] = useState(isOutgoing === "true" ? "calling" : "connecting");
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const toId = parseInt(id, 10);

  useEffect(() => {
    let cancelled = false;
    setupCall(() => cancelled);
    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (callStatus === "connected") {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [callStatus]);

  // Ringtone: browsers block autoplay-with-sound until a user gesture has
  // happened somewhere on the page, so this may silently fail on the very
  // first load — that's a browser limitation, not a bug in this code.
  useEffect(() => {
    if (callStatus === "calling" || callStatus === "connecting") {
      if (!audioRef.current) {
        audioRef.current = new Audio(RINGTONE_URL);
        audioRef.current.loop = true;
      }
      audioRef.current.play().catch((err) => console.log("Ringtone blocked:", err));
    } else if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [callStatus]);

  // Attach streams to <video> elements whenever they change or the
  // video/voice call view swaps in and out (refs remount).
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, cameraOff, callStatus]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callStatus]);

  const setupCall = async (isCancelled) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideoCall });
    } catch (err) {
      if (isCancelled()) return;
      alert("Could not access camera/microphone. Please check permissions.");
      navigate(-1);
      return;
    }

    // The effect that started this run may have already been cleaned up
    // (React StrictMode mounts effects twice in dev) — if so, this pc is
    // already closed, so stop the tracks we just grabbed and bail instead
    // of calling addTrack on a closed connection.
    if (isCancelled()) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    console.log("Got local stream, video tracks:", stream.getVideoTracks().length);
    localStreamRef.current = stream;
    setLocalStream(stream);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      console.log("Remote track received:", event.streams);
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) sendWebrtcIce(toId, JSON.stringify(event.candidate));
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setCallStatus("connected");
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") endCall();
    };

    const handleCallEvent = async (data) => {
      if (String(data.from) !== String(toId) && data.type !== "call_answered") return;

      if (data.type === "call_answered") {
        setCallStatus("connected_pending");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendWebrtcOffer(toId, JSON.stringify(offer));
      } else if (data.type === "webrtc_offer") {
        const remoteDesc = JSON.parse(data.sdp);
        await pc.setRemoteDescription(new RTCSessionDescription(remoteDesc));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendWebrtcAnswer(toId, JSON.stringify(answer));
      } else if (data.type === "webrtc_answer") {
        const remoteDesc = JSON.parse(data.sdp);
        await pc.setRemoteDescription(new RTCSessionDescription(remoteDesc));
      } else if (data.type === "webrtc_ice") {
        const candidate = JSON.parse(data.candidate);
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {}
      } else if (data.type === "call_rejected") {
        setCallStatus("rejected");
        setTimeout(() => navigate(-1), 1500);
      } else if (data.type === "call_ended") {
        setCallStatus("ended");
        setTimeout(() => navigate(-1), 1000);
      } else if (data.type === "call_unavailable") {
        setCallStatus("unavailable");
        setTimeout(() => navigate(-1), 1500);
      }
    };

    addCallListener(handleCallEvent);
    pcRef.current._listener = handleCallEvent;

    if (isOutgoing === "true") {
      sendCallOffer(toId, isVideoCall ? "video" : "voice");
    }
  };

  const cleanup = () => {
    if (pcRef.current) {
      if (pcRef.current._listener) removeCallListener(pcRef.current._listener);
      pcRef.current.close();
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    clearInterval(timerRef.current);
  };

  const acceptCall = () => {
    sendCallAnswer(toId);
    setCallStatus("connected_pending");
  };

  const rejectCall = () => {
    sendCallReject(toId);
    navigate(-1);
  };

  const endCall = () => {
    sendCallEnd(toId);
    cleanup();
    navigate(-1);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = muted;
      });
      setMuted(!muted);
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = cameraOff;
      });
      setCameraOff(!cameraOff);
    }
  };

  const formatDuration = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const statusText = () => {
    if (callStatus === "calling") return isVideoCall ? "Video calling..." : "Calling...";
    if (callStatus === "connecting") return isVideoCall ? "Incoming video call..." : "Incoming call...";
    if (callStatus === "connected_pending") return "Connecting...";
    if (callStatus === "connected") return formatDuration(duration);
    if (callStatus === "rejected") return "Call declined";
    if (callStatus === "ended") return "Call ended";
    if (callStatus === "unavailable") return "User unavailable";
    return "";
  };

  if (isVideoCall && callStatus === "connected") {
    return (
      <div style={styles.videoContainer}>
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={styles.remoteVideo}
          />
        ) : (
          <div style={{ ...styles.remoteVideo, ...styles.videoPlaceholder }}>
            <span style={styles.status}>Waiting for video...</span>
          </div>
        )}
        {localStream && !cameraOff && (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={styles.localVideo}
          />
        )}
        <div style={styles.videoTopBar}>
          <span style={styles.videoName}>{username}</span>
          <span style={styles.videoDuration}>{formatDuration(duration)}</span>
        </div>
        <div style={styles.videoControlsRow}>
          <button style={styles.controlBtnDark} onClick={toggleMute} aria-label="Toggle mute">
            {muted ? <MicOff size={24} color="#fff" /> : <Mic size={24} color="#fff" />}
          </button>
          <button style={styles.controlBtnDark} onClick={toggleCamera} aria-label="Toggle camera">
            {cameraOff ? <VideoOff size={24} color="#fff" /> : <VideoIcon size={24} color="#fff" />}
          </button>
          <button style={{ ...styles.circleBtn, ...styles.rejectBtn }} onClick={endCall} aria-label="End call">
            <PhoneOff size={26} color="#fff" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.topSection}>
        <div style={styles.bigAvatar}>
          <span style={styles.bigAvatarText}>{username?.[0]?.toUpperCase() || "?"}</span>
        </div>
        <p style={styles.name}>{username || `User ${id}`}</p>
        <p style={styles.status}>{statusText()}</p>
        {isVideoCall && <p style={styles.videoTag}>Video Call</p>}
      </div>

      <div style={styles.bottomSection}>
        {callStatus === "connecting" ? (
          <div style={styles.incomingButtons}>
            <button style={{ ...styles.circleBtn, ...styles.rejectBtn }} onClick={rejectCall} aria-label="Decline">
              <PhoneOff size={28} color="#fff" />
            </button>
            <button style={{ ...styles.circleBtn, ...styles.acceptBtn }} onClick={acceptCall} aria-label="Accept">
              <Phone size={28} color="#fff" />
            </button>
          </div>
        ) : (
          <>
            <div style={styles.controlsRow}>
              <button style={styles.controlBtn} onClick={toggleMute} aria-label="Toggle mute">
                {muted ? <MicOff size={24} color="#212121" /> : <Mic size={24} color="#212121" />}
              </button>
              <button
                style={styles.controlBtn}
                onClick={() => setSpeakerOn(!speakerOn)}
                aria-label="Toggle speaker"
              >
                {speakerOn ? <Volume2 size={24} color="#212121" /> : <Volume1 size={24} color="#212121" />}
              </button>
            </div>
            <button
              style={{ ...styles.circleBtn, ...styles.rejectBtn, alignSelf: "center" }}
              onClick={endCall}
              aria-label="End call"
            >
              <PhoneOff size={28} color="#fff" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100dvh",
    backgroundColor: "#075E54",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 60,
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  topSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: 40,
  },
  bigAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "var(--accent, #F4B400)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  bigAvatarText: { fontSize: 44, fontWeight: 700, color: "#212121" },
  name: { fontSize: 24, fontWeight: 600, color: "#fff", marginBottom: 8, margin: 0 },
  status: { fontSize: 15, color: "#e0e0e0", margin: 0 },
  videoTag: { fontSize: 12, color: "var(--accent, #F4B400)", marginTop: 6, fontWeight: 600 },
  bottomSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 30,
  },
  controlsRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    gap: 30,
    marginBottom: 10,
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    border: "none",
    cursor: "pointer",
  },
  controlBtnDark: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    border: "none",
    cursor: "pointer",
  },
  incomingButtons: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingLeft: 40,
    paddingRight: 40,
    boxSizing: "border-box",
  },
  circleBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    border: "none",
    cursor: "pointer",
  },
  acceptBtn: { backgroundColor: "#43A047" },
  rejectBtn: { backgroundColor: "#E53935" },
  videoContainer: {
    position: "relative",
    height: "100dvh",
    width: "100%",
    backgroundColor: "#000",
    overflow: "hidden",
  },
  remoteVideo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    backgroundColor: "#000",
  },
  videoPlaceholder: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
  },
  localVideo: {
    position: "absolute",
    top: 50,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 12,
    backgroundColor: "#333",
    objectFit: "cover",
    transform: "scaleX(-1)", // mirror, like the RN `mirror` prop
  },
  videoTopBar: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 130,
    display: "flex",
    flexDirection: "column",
  },
  videoName: { color: "#fff", fontSize: 18, fontWeight: 600 },
  videoDuration: { color: "#e0e0e0", fontSize: 13, marginTop: 2 },
  videoControlsRow: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
  },
};