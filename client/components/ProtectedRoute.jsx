import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { useSelector } from "react-redux";

const ProtectedRoute = ({ children }) => {
  const uid = useSelector((state) => state.user.user.uid);
  const isDev = import.meta.env.DEV;

  return (uid || isDev) ? children : <Navigate to="/auth/login" replace />;
};

export default ProtectedRoute;
