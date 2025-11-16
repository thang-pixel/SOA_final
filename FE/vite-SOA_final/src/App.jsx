import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { login } from "./redux/reducers/authSlice";
import AllRoute from "./routes/AllRoute";
import { BrowserRouter } from "react-router-dom";
function App() {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (token && user) {
      dispatch(login({ token, user: JSON.parse(user) }));
    }
    setLoading(false);
  }, [dispatch]);
  if (loading) {
        return <div />; 
    }
  return (
    <BrowserRouter>
      <AllRoute />
    </BrowserRouter>
  );
}

export default App;