import { BrowserRouter, Route, Routes } from "react-router-dom";
import JoinRoom from "./Pages/JoinRoom";
import PhaserRoom from "./components/Room";
import { LiveKitProvider } from "./LiveKit/LiveKitContext/LiveKitProvider";
import { LocalMediaContextProvider } from "./Providers/LocalMedia/Context";
import ProtectedRoute from "./Providers/ProtectedRoutes/Context";
import SignPage from "./Pages/SignPage";

function App() {
  // const randomUserId = useMemo(() => crypto.randomUUID(), []);

  return (
    <LiveKitProvider>
      <LocalMediaContextProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <JoinRoom />
                </ProtectedRoute>
              }
            />
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
