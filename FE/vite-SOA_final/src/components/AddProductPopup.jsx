import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_DOMAIN from '../constants/apiDomain';
import './AddProductPopup.css';

const AddProductPopup = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '',
    price: 0,
    cost: 0,
    stock: 0,
    image: '',
  });
  
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchImages();
    }
  }, [isOpen]);

  const fetchImages = async () => {
    try {
      const response = await axios.get(`${API_DOMAIN}/api/inventory/img`);
      setImages(response.data);
    } catch (error) {
      console.error('Error fetching images:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      setUploadingImage(true);
      const response = await axios.post(`${API_DOMAIN}/api/inventory/upload-img`, formDataUpload);
      const imagePath = response.data.path;
      setSelectedImage(imagePath);
      setFormData({ ...formData, image: imagePath });
      fetchImages(); // Refresh danh sách ảnh
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Lỗi khi upload ảnh');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSelectImage = (imageName) => {
    const imagePath = `/img/${imageName}`;
    setSelectedImage(imagePath);
    setFormData({ ...formData, image: imagePath });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.code || !formData.name) {
      alert('Vui lòng nhập mã hàng và tên hàng');
      return;
    }

    try {
      await axios.post(`${API_DOMAIN}/api/inventory/product/add`, formData);
      alert('Thêm hàng hóa thành công!');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Lỗi khi thêm hàng hóa: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleClose = () => {
    setFormData({
      code: '',
      name: '',
      category: '',
      price: 0,
      cost: 0,
      stock: 0,
      image: '',
    });
    setSelectedImage('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="popup-overlay" onClick={handleClose}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <h2>Tạo hàng hóa</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-content">
            <div className="form-row">
              <div className="form-group">
                <label>Mã hàng <span className="required">*</span></label>
                <input
                  type="text"
                  name="code"
                  placeholder="Nhập mã hàng"
                  value={formData.code}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Tên hàng <span className="required">*</span></label>
                <input
                  type="text"
                  name="name"
                  placeholder="Nhập tên hàng"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Nhóm hàng</label>
              <input
                type="text"
                name="category"
                placeholder="Nhập nhóm hàng"
                value={formData.category}
                onChange={handleInputChange}
              />
            </div>

            <div className="section-divider">
              <h3>Giá vốn, giá bán</h3>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Giá vốn</label>
                <input
                  type="number"
                  name="cost"
                  value={formData.cost}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Giá bán</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>
            </div>

            <div className="section-divider">
              <h3>Tồn kho</h3>
            </div>

            <div className="form-group">
              <label>Số lượng tồn kho</label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleInputChange}
                min="0"
              />
            </div>

            <div className="section-divider">
              <h3>Hình ảnh sản phẩm</h3>
            </div>

            <div className="image-section">
              <p className="image-hint">Mỗi ảnh không quá 2 MB</p>
              
              <div className="image-upload-area">
                {selectedImage ? (
                  <div className="selected-image">
                    <img src={selectedImage} alt="Selected" />
                    <button type="button" onClick={() => {
                      setSelectedImage('');
                      setFormData({ ...formData, image: '' });
                    }}>×</button>
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <span>📷</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      style={{ display: 'none' }}
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="upload-label">
                      {uploadingImage ? 'Đang tải...' : 'Tải ảnh lên'}
                    </label>
                  </div>
                )}
              </div>

              <div className="image-gallery">
                <h4>Chọn từ thư viện:</h4>
                <div className="image-grid">
                  {images.map((img, index) => (
                    <div
                      key={index}
                      className={`image-item ${selectedImage === `/img/${img}` ? 'selected' : ''}`}
                      onClick={() => handleSelectImage(img)}
                    >
                      <img src={`/img/${img}`} alt={img} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="popup-footer">
            <button type="button" className="btn-cancel" onClick={handleClose}>
              Bỏ qua
            </button>
            <button type="submit" className="btn-save">
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductPopup;