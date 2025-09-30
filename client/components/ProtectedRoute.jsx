import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-paywaka-500"></div>
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/auth/login" replace /> : children;
};

export default ProtectedRoute;
