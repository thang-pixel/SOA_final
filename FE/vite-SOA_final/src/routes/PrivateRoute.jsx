import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";

function PrivateRoute({ role }) {
  const { user } = useSelector((state) => state.auth);
  console.log("PrivateRoute user:", user, "required role:", role);
  
  if (!user) return <Navigate to="/login" />;
  
  // Cho phép admin truy cập cả admin và user routes
  if (role === "user" && (user.role === "user" || user.role === "admin")) {
    return <Outlet />;
  }
  
  if (role === "admin" && user.role !== "admin") {
    return <Navigate to="/unauthorized" />;
  }
  
  if (role && user.role !== role && user.role !== "admin") {
    return <Navigate to="/unauthorized" />;
  }
  
  return <Outlet />;
}

export default PrivateRoute;