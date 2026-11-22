import { Button } from "./ui/button";

export function AppButton({ className = "", ...props }) {
  const names = className.split(/\s+/);
  const variant = names.includes("danger-button") ? "destructive"
    : names.includes("primary-button") ? "default"
    : names.some((name) => ["secondary-button", "refresh-data-btn", "refresh-btn", "dl-range-btn", "switch-client-btn"].includes(name))
      ? "outline"
      : "ghost";

  return <Button variant={variant} className={className} {...props} />;
}
