import { Routes, Route } from "react-router-dom";
import Login from "../pages/login";
import Home from "../pages/user/home";
import { Navigate } from "react-router-dom";
import PrivateRoute from "./PrivateRoute";
import UserLayout from "../layout/User/UserLayout";
import Inventory from "../pages/user/inventory";
import ImportOrder from "../pages/user/order"; // Thêm import
import OrderManager from "../pages/user/order-manager";
import ExportOrder from "../pages/user/order-export";
import ReportPage from "../pages/user/report";
function UserRoute() {
  return (
    <Routes>
      <Route element={<PrivateRoute role="user" />}>
        <Route path="/*" element={<UserLayout />}>
          <Route index element={<Home />} />
          <Route path="home" element={<Home />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="user/order" element={<ImportOrder />} />
          <Route path="user/order-export" element={<ExportOrder />} />
          <Route path="order" element={<OrderManager />} />
          <Route path="reports" element={<ReportPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default UserRoute;