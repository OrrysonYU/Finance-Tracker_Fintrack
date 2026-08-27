import { Apple } from "lucide-react";
import { Button } from "../../../components/ui";

export function AppleButton({ onClick, loading = false, disabled = false }) {
  return <Button type="button" variant="secondary" size="lg" className="auth-google-button" onClick={onClick} loading={loading} disabled={disabled} aria-label="Continue with Apple">
    {!loading && <Apple size={18} aria-hidden="true" />}{loading ? "Connecting to Apple..." : "Continue with Apple"}
  </Button>;
}
