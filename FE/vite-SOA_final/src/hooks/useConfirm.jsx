import { useState, useCallback } from 'react';

export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState({
    open: false,
    title: 'Xác nhận',
    message: 'Bạn có chắc chắn muốn thực hiện hành động này?',
    type: 'warning',
    confirmText: 'Xác nhận',
    cancelText: 'Hủy bỏ',
    onConfirm: null,
    loading: false
  });

  const showConfirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        open: true,
        title: options.title || 'Xác nhận',
        message: options.message || 'Bạn có chắc chắn muốn thực hiện hành động này?',
        type: options.type || 'warning',
        confirmText: options.confirmText || 'Xác nhận',
        cancelText: options.cancelText || 'Hủy bỏ',
        onConfirm: () => {
          resolve(true);
          setConfirmState(prev => ({ ...prev, open: false }));
        },
        loading: false
      });
    });
  }, []);

  const hideConfirm = useCallback(() => {
    setConfirmState(prev => ({ ...prev, open: false }));
  }, []);

  const setLoading = useCallback((loading) => {
    setConfirmState(prev => ({ ...prev, loading }));
  }, []);

  return {
    confirmState,
    showConfirm,
    hideConfirm,
    setLoading
  };
};