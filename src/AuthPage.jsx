import { useState } from "react";
import Register from "./Register";
import Login from "./Login";

function AuthPage() {
  const [showLogin, setShowLogin] = useState(false);

  if (showLogin) {
    return <Login onSwitchToRegister={() => setShowLogin(false)} />;
  }

  return <Register onSwitchToLogin={() => setShowLogin(true)} />;
}

export default AuthPage;