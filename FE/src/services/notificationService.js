import axios from "axios";

const API_BASE = "http://localhost:2000";

export async function createPayment({ payerId, studentId, email }) {
  return fetch('http://localhost:2000/api/payments/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payerId, studentId, email })
  });
}

export const verifyOTP = async (transactionId, otp) => {
  try {
    const response = await axios.post(`${API_BASE}/otp/verify`, { transactionId, otp });
    return response.data;
  } catch (error) {
    console.error("Error verifying OTP:", error.response?.data || error.message);
    throw error;
  }
};
