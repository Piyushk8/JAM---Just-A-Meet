// ProtectedRoute.tsx
import type { RootState } from "@/Redux";
import React, { type JSX } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

type Props = { children: JSX.Element };

const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const user = useSelector((state: RootState) => state.authSlice.userInfo);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
