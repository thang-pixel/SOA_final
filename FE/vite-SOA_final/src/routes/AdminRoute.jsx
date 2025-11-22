import { Routes, Route } from "react-router-dom";
import AdminLayout from "../layout/Admin/AdminLayout";
import Dashboard from "../pages/admin/Dashboard";
import PrivateRoute from "./PrivateRoute";
import ErrorPage from "../pages/ErrorPage";
import AccountManagement from "../pages/admin/AccountManagement";
function AdminRoute() {
  return (
    <Routes>
      <Route element={<PrivateRoute role="admin" />}>
        <Route path="/*" element={<AdminLayout />}>
          <Route index element={<Dashboard />} /> {/* Trang chủ admin */}
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="orders" element={<div>Trang đơn hàng</div>} />
          <Route path="accounts" element={<AccountManagement />} />
          <Route path="inventory" element={<div>Trang sản phẩm tồn kho</div>} />
          <Route path="import" element={<div>Trang nhập kho</div>} />
          <Route path="export" element={<div>Trang xuất kho</div>} />
          <Route path="reports" element={<div>Trang báo cáo</div>} />
          <Route path="settings" element={<div>Trang cài đặt</div>} />
        </Route>
      </Route>
      <Route path="/unauthorized" element={<ErrorPage status={401} message="Bạn không có quyền truy cập trang này!" />} />
      <Route path="*" element={<ErrorPage status={404} message="Page Not Found" />} />
    </Routes>

  );
}

export default AdminRoute;