import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isPartnerAuthenticated } from "@/lib/partnerAuth";

export function PartnerProtectedRoute() {
  const location = useLocation();
  if (!isPartnerAuthenticated()) {
    return <Navigate to="/partner/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
