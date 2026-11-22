import { RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

export function AppButton({ className = "", ...props }) {
  const names = className.split(/\s+/);
  const variant = names.includes("danger-button") ? "destructive"
    : names.includes("primary-button") ? "default"
    : names.some((name) => ["secondary-button", "refresh-btn", "dl-range-btn", "switch-client-btn"].includes(name))
      ? "outline"
      : "ghost";

  return <Button variant={variant} className={className} {...props} />;
}

export function HeaderRefreshButton({ refreshing, onClick, title }) {
  return (
    <AppButton
      type="button"
      className="primary-button header-refresh"
      onClick={onClick}
      title={title}
      disabled={refreshing}
      aria-busy={refreshing}
    >
      <RefreshCw className="header-refresh-icon" aria-hidden="true" />
      <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
    </AppButton>
  );
}
