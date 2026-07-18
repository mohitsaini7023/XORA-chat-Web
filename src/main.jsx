import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import "./context/Theme.css";
import App from "./App.jsx";
import { UserProvider } from "./context/UserContext";
import { WebSocketProvider } from "./context/WebSocketContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
    <ThemeProvider>

      <UserProvider>
        <WebSocketProvider>
        <App />
        </WebSocketProvider>
      </UserProvider>
    </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);