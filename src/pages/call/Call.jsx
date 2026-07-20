import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Mic, MicOff, Video as VideoIcon, VideoOff, Volume2, Volume1, Phone, PhoneOff } from "lucide-react";
import { useWebSocketContext } from "../../context/WebSocketContext";
import { useUser } from "../../context/UserContext";

const ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
const RINGTONE_URL = "https://actions.google.com/sounds/v1/alarms/phone_alerts_and_rings.ogg";

export default function CallScreen(props) {
  const params = useParams();
  const [searchParams] = useSearchParams();

  const id = props.id || params.id;
  const username = props.username || searchParams.get("username");
  const isOutgoing = props.isOutgoing ?? searchParams.get("isOutgoing") === "true";
  const paramCallType = props.callType || searchParams.get("callType");

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

  const goBack = () => {
    if (props.onClose) {
      props.onClose();
    } else {
      navigate(-1);
    }
  };

  const [callStatus, setCallStatus] = useState(isOutgoing ? "calling" : "connecting");
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
      goBack();
      return;
    }

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
        setTimeout(goBack, 1500);
      } else if (data.type === "call_ended") {
        setCallStatus("ended");
        setTimeout(goBack, 1000);
      } else if (data.type === "call_unavailable") {
        setCallStatus("unavailable");
        setTimeout(goBack, 1500);
      }
    };

    addCallListener(handleCallEvent);
    pcRef.current._listener = handleCallEvent;

    // FIX: this used to fire twice — once here (guarded by the correct
    // boolean `isOutgoing`) and again further down guarded by
    // `isOutgoing === "true"`, which is always false once isOutgoing is a
    // real boolean (as it is now, coming from props). The second, dead
    // copy has been removed; this is the only place the offer is sent.
    if (isOutgoing) {
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
    goBack();
  };

  const endCall = () => {
    sendCallEnd(toId);
    cleanup();
    goBack();
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
          <video ref={remoteVideoRef} autoPlay playsInline style={styles.remoteVideo} />
        ) : (
          <div style={{ ...styles.remoteVideo, ...styles.videoPlaceholder }}>
            <span style={styles.status}>Waiting for video...</span>
          </div>
        )}
        {localStream && !cameraOff && (
          <video ref={localVideoRef} autoPlay playsInline muted style={styles.localVideo} />
        )}
        <div style={styles.videoTopBar}>
          <span style={styles.videoName}>{username}</span>
          <span style={styles.videoDuration}>{formatDuration(duration)}</span>
        </div>
        <div style={styles.videoControlsRow}>
          <button style={styles.controlBtnDark} onClick={toggleMute} aria-label="Toggle mute">
            {muted ? <MicOff size={20} color="#fff" /> : <Mic size={20} color="#fff" />}
          </button>
          <button style={styles.controlBtnDark} onClick={toggleCamera} aria-label="Toggle camera">
            {cameraOff ? <VideoOff size={20} color="#fff" /> : <VideoIcon size={20} color="#fff" />}
          </button>
          <button style={{ ...styles.circleBtn, ...styles.rejectBtn }} onClick={endCall} aria-label="End call">
            <PhoneOff size={22} color="#fff" />
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
              <PhoneOff size={24} color="#fff" />
            </button>
            <button style={{ ...styles.circleBtn, ...styles.acceptBtn }} onClick={acceptCall} aria-label="Accept">
              <Phone size={24} color="#fff" />
            </button>
          </div>
        ) : (
          <>
            <div style={styles.controlsRow}>
              <button style={styles.controlBtn} onClick={toggleMute} aria-label="Toggle mute">
                {muted ? <MicOff size={20} color="#212121" /> : <Mic size={20} color="#212121" />}
              </button>
              <button style={styles.controlBtn} onClick={() => setSpeakerOn(!speakerOn)} aria-label="Toggle speaker">
                {speakerOn ? <Volume2 size={20} color="#212121" /> : <Volume1 size={20} color="#212121" />}
              </button>
            </div>
            <button
              style={{ ...styles.circleBtn, ...styles.rejectBtn, alignSelf: "center" }}
              onClick={endCall}
              aria-label="End call"
            >
              <PhoneOff size={24} color="#fff" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  // FIX: was height: "100dvh" (forces full viewport height even inside
  // the small draggable modal box). Now fills whatever size the parent
  // .call-modal container gives it.
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    width: "100%",
    backgroundColor: "#075E54",
    justifyContent: "space-between",
    padding: "24px 12px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    boxSizing: "border-box",
  },
  topSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: 10,
  },
  bigAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "var(--accent, #F4B400)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  bigAvatarText: { fontSize: 32, fontWeight: 700, color: "#212121" },
  name: { fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 6, margin: 0 },
  status: { fontSize: 13, color: "#e0e0e0", margin: 0 },
  videoTag: { fontSize: 11, color: "var(--accent, #F4B400)", marginTop: 6, fontWeight: 600 },
  bottomSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
  },
  controlsRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginBottom: 6,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    border: "none",
    cursor: "pointer",
  },
  controlBtnDark: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    paddingLeft: 20,
    paddingRight: 20,
    boxSizing: "border-box",
  },
  circleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    height: "100%",
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
    top: 8,
    right: 8,
    width: 70,
    height: 96,
    borderRadius: 10,
    backgroundColor: "#333",
    objectFit: "cover",
    transform: "scaleX(-1)",
  },
  videoTopBar: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 90,
    display: "flex",
    flexDirection: "column",
  },
  videoName: { color: "#fff", fontSize: 14, fontWeight: 600 },
  videoDuration: { color: "#e0e0e0", fontSize: 11, marginTop: 2 },
  videoControlsRow: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
  },
};