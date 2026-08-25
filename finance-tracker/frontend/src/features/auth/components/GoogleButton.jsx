import { Chrome } from "lucide-react";
import { Button } from "../../../components/ui";

export function GoogleButton({ onClick, loading = false, disabled = false }) {
  return <Button type="button" variant="secondary" size="lg" className="auth-google-button" onClick={onClick} loading={loading} disabled={disabled} aria-label="Continue with Google">
    {!loading && <Chrome size={18} aria-hidden="true" />}{loading ? "Connecting to Google..." : "Continue with Google"}
  </Button>;
}
