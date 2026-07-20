import { Routes, Route } from "react-router-dom";
import Welcome from "./pages/Welcome/Welcome";
import PhoneLoginScreen from "./pages/auth/Login";
import OtpVerifyScreen from "./pages/auth/Otpverify";
import ChatScreen from "./pages/Chat/Chat";
import { Home } from "./pages/Home/Home";
import ProtectedRoute from "./routes/PrivateRoute";

// FIX: removed the old "/call/:id" route + CallScreen import — calls now
// open exclusively as the draggable modal from inside Home (see
// Home.jsx + pages/modal/CallModal.jsx), so a separate full-page route
// for it is no longer needed.
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
    </Routes>
  );
}

export default App;