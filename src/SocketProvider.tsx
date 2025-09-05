// src/context/SocketProvider.tsx
import React, { createContext, useContext, useEffect, useRef } from "react";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  type SocketType,
} from "./socket";

const SocketContext = createContext<SocketType | null>(null);

export const useSocket = () => {
  const socket = useContext(SocketContext);
  if (!socket) throw new Error("Socket not available in context");
  return socket;
};

export const SocketProvider = ({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) => {
  const socket = useRef(getSocket()).current;

  useEffect(() => {
    connectSocket(userId);
    return () => {
      disconnectSocket();
    };
  }, [userId]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};
