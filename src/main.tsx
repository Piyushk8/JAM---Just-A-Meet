import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { Provider } from "react-redux";
import { store } from "./Redux/index.ts";
import { SocketProvider } from "./SocketProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SocketProvider userId="user123">
      <Provider store={store}>
        <App />
      </Provider>
    </SocketProvider>
  </StrictMode>
);
