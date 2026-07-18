import { Routes, Route } from "react-router-dom";

import Welcome from "./pages/Welcome/Welcome";
import PhoneLoginScreen from "./pages/auth/Login";
import OtpVerifyScreen from "./pages/auth/Otpverify";
import ChatScreen from "./pages/chat/Chat";
import { Home } from "./pages/home/Home";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />

      <Route path="/login" element={<PhoneLoginScreen />} />
      <Route path="/otp-verify" element={<OtpVerifyScreen />} />
      <Route path="/home" element={<Home />} />
      <Route path="/chat/:id" element={<ChatScreen />} />
    </Routes>
  );
}

export default App;