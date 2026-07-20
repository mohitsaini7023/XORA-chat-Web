import { useWebSocketContext } from "./src/context/WebSocketContext";
import CallModal from "./src/pages/modal/CallModal";

export default function GlobalCallModal(){

const {
showCall,
setShowCall,
callData
}=useWebSocketContext();

if(!showCall) return null;

return(
<CallModal
data={callData}
onClose={()=>setShowCall(false)}
/>
);

}