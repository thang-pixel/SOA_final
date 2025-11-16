import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
function PrivateRoute({ role }) {
  const { user } = useSelector((state) => state.auth);
  console.log("PrivateRoute user:", user, "required role:", role);
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/unauthorized" />;
  return <Outlet />;
}
export default PrivateRoute;