import { Routes, Route } from "react-router-dom";

import Welcome from "./pages/Welcome/Welcome";
import PhoneLoginScreen from "./pages/auth/Login";
import OtpVerifyScreen from "./pages/auth/Otpverify";
import ChatScreen from "./pages/Chat/Chat";
import { Home } from "./pages/Home/Home";
import ProtectedRoute from "./routes/PrivateRoute";
import CallScreen from "./pages/call/Call";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />

      <Route path="/login" element={<PhoneLoginScreen />} />
      <Route path="/otp-verify" element={<OtpVerifyScreen />} />

      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:id"
        element={
          <ProtectedRoute>
            <ChatScreen />
          </ProtectedRoute>
        }
      />
      <Route path="/call/:id" element={<ProtectedRoute><CallScreen /></ProtectedRoute>} />
    </Routes>
  );
}

export default App;