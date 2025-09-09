// ProtectedRoute.tsx
import MainLoader from "@/components/MainLoader";
import type { RootState } from "@/Redux";
import React, { type JSX } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

type Props = { children: JSX.Element };

const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const { userInfo, loading } = useSelector(
    (state: RootState) => state.authSlice
  );

  if (loading)
    return (
      <div>
        <MainLoader />
      </div>
    );
  if (!userInfo) return <Navigate to="/login" />;

  return children;
};

export default ProtectedRoute;
