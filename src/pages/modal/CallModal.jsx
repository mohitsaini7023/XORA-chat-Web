import Draggable from "react-draggable";
import "./cll.css";
import CallScreen from "../call/Call";

export default function CallModal({ data, onClose }) {
  return (
    <Draggable handle=".drag-header">
      <div className="call-modal">

        <div className="drag-header">
          <span>
            {data?.callType === "video"
              ? "📹 Video Call"
              : "📞 Voice Call"}
          </span>

          <button onClick={onClose}>✕</button>
        </div>

        <CallScreen
          id={data?.id}
          username={data?.username}
          isOutgoing={data?.isOutgoing}
          callType={data?.callType}
          onClose={onClose}
        />

      </div>
    </Draggable>
  );
}