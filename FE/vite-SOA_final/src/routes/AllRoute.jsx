import {Routes, Route, Navigate} from "react-router-dom";
import AdminRoute from "./AdminRoute";
import UserRoute from "./UserRoute";
import Login from "../pages/login";
function AllRoute() {
  return (
    <Routes> 
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={<UserRoute />} />
      <Route path="/admin/*" element={<AdminRoute />} />
    </Routes>
  );
}  
export default AllRoute;