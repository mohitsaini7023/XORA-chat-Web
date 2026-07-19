import { Navigate } from "react-router-dom";
import { useUser } from "../context/UserContext";


export default function ProtectedRoute({ children }) {
  const { userId, isLoading } = useUser();

  if (isLoading) {
    return null;
  }

  if (!userId) {
    return <Navigate to="/" replace />;
  }

  return children;
}