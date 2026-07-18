import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { UserProvider } from "./context/UserContext";
import { WebSocketProvider } from "./context/WebSocketContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <UserProvider>
        <WebSocketProvider>
        <App />
        </WebSocketProvider>
      </UserProvider>
    </BrowserRouter>
  </StrictMode>
);