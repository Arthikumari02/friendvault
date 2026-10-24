import Link from "next/link";
import { LoginForm } from "@/features/auth/components/LoginForm";

export default function LoginView() {
  return <div className="login-page"><div className="login-art"><div className="login-polaroid polaroid"><div className="polaroid-photo photo-dinner" role="img" aria-label="Friends sharing dinner" /><p>you had to be there</p></div></div><div className="login-panel paper"><Link className="brand login-brand" href="/">Friend <em>Vault</em></Link><LoginForm /></div></div>;
}
