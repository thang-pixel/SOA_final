import { Routes, Route } from "react-router-dom";
import Login from "../pages/login";
import Home from "../pages/user/home";
import { Navigate } from "react-router-dom";
import PrivateRoute from "./PrivateRoute";
import UserLayout from "../layout/User/UserLayout";
function UserRoute() {
  return (
    <Routes>
      <Route element={<PrivateRoute role="user" />}>
        <Route path="/*" element={<UserLayout />}>
          <Route index element={<Home />} />
          <Route path="home" element={<Home />} />
        </Route>
      </Route>
    </Routes>

  );
}

export default UserRoute;
