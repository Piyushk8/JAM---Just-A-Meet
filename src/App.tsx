import { BrowserRouter, Route, Routes } from "react-router-dom";
import JoinRoom from "./Pages/JoinRoom";
import PhaserRoom from "./components/Room";
import { LiveKitProvider } from "./LiveKit/LiveKitContext/LiveKitProvider";
import { LocalMediaContextProvider } from "./Providers/LocalMedia/Context";
import ProtectedRoute from "./Providers/ProtectedRoutes/Context";
import SignPage from "./Pages/SignPage";
import { useDispatch } from "react-redux";
import { useEffect } from "react";
import { fetchCurrentUser } from "./Redux/auth";
import type { AppDispatch } from "./Redux";
import Landing from "./LandingPage/LandingPage";

function App() {
  const dispatch = useDispatch<AppDispatch>();
  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);
  // const randomUserId = useMemo(() => crypto.randomUUID(), []);

  return (
    <LiveKitProvider>
      <LocalMediaContextProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/join"
              element={
                <ProtectedRoute>
                  <JoinRoom />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Landing />} />
            <Route
              path={`/r/:roomId`}
              element={
                <ProtectedRoute>
                  <PhaserRoom />
                </ProtectedRoute>
              }
            />
            <Route path={"/login"} element={<SignPage />} />
          </Routes>
        </BrowserRouter>
      </LocalMediaContextProvider>
    </LiveKitProvider>
  );
}

export default App;
