import { BrowserRouter, Route, Routes } from "react-router-dom";
import JoinRoom from "./Pages/JoinRoom";
import PhaserRoom from "./components/Room";
import { LiveKitProvider } from "./LiveKit/LiveKitContext/LiveKitProvider";
import { LocalMediaContextProvider } from "./Providers/LocalMedia/Context";

function App() {
  // const randomUserId = useMemo(() => crypto.randomUUID(), []);

  return (
    <LiveKitProvider>
      <LocalMediaContextProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<JoinRoom />} />
            <Route path="/home" element={<JoinRoom />} />
            <Route path={`/r/:roomId`} element={<PhaserRoom />} />
          </Routes>
        </BrowserRouter>
      </LocalMediaContextProvider>
    </LiveKitProvider>
  );
}

export default App;
