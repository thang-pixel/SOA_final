import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInventoryItems } from '../../../redux/action/inventory';
import { setSearchFilter, setStockFilter } from '../../../redux/reducers/inventorySlice';
import AddProductPopup from '../../../components/AddProductPopup';
import './inventory.css';

function Inventory() {
  const dispatch = useDispatch();
  const { items, loading, error, filters } = useSelector((state) => state.inventory);
  const [openPopup, setOpenPopup] = React.useState(false);
  const user = useSelector((state) => state.auth.user);
  
  console.log('Logged in user:', user);
  
  useEffect(() => {
    dispatch(fetchInventoryItems());
  }, [dispatch]);

  const handleSearch = (e) => {
    console.log('Search input:', e.target.value);
    dispatch(setSearchFilter(e.target.value));
  };

  const handleStockFilter = (status) => {
    dispatch(setStockFilter(status));
  };

  const handleAddSuccess = () => {
    dispatch(fetchInventoryItems());
  };

  // Lọc items theo filters
  const filteredItems = items.filter((item) => {
    const matchSearch = 
      item.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.code.toLowerCase().includes(filters.search.toLowerCase());
    
    let matchStock = true;
    if (filters.stockStatus === 'in-stock') {
      matchStock = item.stock > 0;
    } else if (filters.stockStatus === 'out-of-stock') {
      matchStock = item.stock === 0;
    }

    return matchSearch && matchStock;
  });

  // Tính tổng tồn kho
  const totalStock = items.reduce((sum, item) => sum + item.stock, 0);

  if (loading) return <div className="loading">Đang tải dữ liệu...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="inventory-container">
      <h1>Hàng hóa</h1>
    
      {/* Thanh tìm kiếm và filter */}
      <div className="toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Theo mã, tên hàng"
            value={filters.search}
            onChange={handleSearch}
          />
        </div>
        <div className="actions">
          <button className="btn-primary" onClick={() => setOpenPopup(true)}>
            + Tạo mới
          </button>
          <button className="btn-secondary">Import file</button>
          <button className="btn-secondary">Xuất file</button>
        </div>
      </div>

      {/* Sidebar filters */}
      <div className="content-wrapper">
        <aside className="sidebar">
          <div className="filter-section">
            <h3>Nhóm hàng</h3>
            <input type="text" placeholder="Chọn nhóm hàng" />
          </div>

          <div className="filter-section">
            <h3>Tồn kho</h3>
            <select onChange={(e) => handleStockFilter(e.target.value)} value={filters.stockStatus}>
              <option value="all">Tất cả</option>
              <option value="in-stock">Còn hàng</option>
              <option value="out-of-stock">Hết hàng</option>
            </select>
          </div>

          <div className="filter-section">
            <h3>Dự kiến hết hàng</h3>
            <label>
              <input type="radio" name="outOfStock" defaultChecked /> Toàn thời gian
            </label>
            <label>
              <input type="radio" name="outOfStock" /> Tùy chỉnh
            </label>
          </div>

          <div className="filter-section">
            <h3>Thời gian tạo</h3>
            <label>
              <input type="radio" name="createdTime" defaultChecked /> Toàn thời gian
            </label>
            <label>
              <input type="radio" name="createdTime" /> Tùy chỉnh
            </label>
          </div>

          <button className="btn-filter">Tất cả</button>
        </aside>

        {/* Bảng dữ liệu */}
        <main className="main-content">
          <div className="total-stock">
            <span>Tổng tồn kho: <strong>{totalStock}</strong></span>
          </div>

          <table className="inventory-table">
            <thead>
              <tr>
                <th><input type="checkbox" /></th>
                <th>  </th>
                <th>Mã hàng</th>
                <th>Tên hàng</th>
                <th>Giá bán</th>
                <th>Giá vốn</th>
                <th>Tồn kho</th>
                <th>Khách đặt</th>
                <th>Thời gian tạo</th>
                <th>Dự kiến hết hàng</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="10" className="no-data">Không có dữ liệu</td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item._id}>
                    <td><input type="checkbox" /></td>
                    <td>
                      <img 
                        src={item.image || '/img/default.png'} 
                        alt={item.name} 
                        style={{ width: '50px', height: '50px', objectFit: 'cover' }} 
                      />
                    </td>
                    <td>{item.code}</td>
                    <td>{item.name}</td>
                    <td>{item.price.toLocaleString()}</td>
                    <td>{item.cost.toLocaleString()}</td>
                    <td>{item.stock}</td>
                    <td>{item.ordered}</td>
                    <td>{new Date(item.createdAt).toLocaleString('vi-VN')}</td>
                    <td>{item.expectedOutOfStock ? new Date(item.expectedOutOfStock).toLocaleDateString('vi-VN') : '---'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </main>
      </div>

      {/* Popup thêm sản phẩm mới */}
      <AddProductPopup
        isOpen={openPopup}
        onClose={() => setOpenPopup(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}

export default Inventory;