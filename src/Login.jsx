import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "./Apii/authApi";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const getPasswordError = (password) => {
    if (!password.trim()) {
      return "Password is required";
    }

    if (password.length < 6) {
      return "Password must be at least 6 characters";
    }

    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }

    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }

    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number";
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      return "Password must contain at least one special character";
    }

    return "";
  };

  const validateLogin = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    const passwordError = getPasswordError(password);

    if (passwordError) {
      newErrors.password = passwordError;
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateLogin()) return;

    try {
      setLoading(true);
      setMessage("");

      const result = await loginUser({
        email: email.trim(),
        password: password,
      });

      console.log("Login success:", result);

      setMessage("Login successful");

      navigate("/watchlist");
    } catch (error) {
      console.error("Login error:", error);
      setMessage(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <form
        noValidate
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-white p-6 rounded-xl shadow-md"
      >
        <h2 className="text-2xl font-bold mb-5 text-center text-gray-900">
          Login
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>

          <input
            type="text"
            className={`w-full border rounded-lg px-3 py-2 outline-none ${
              errors.email ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Enter your email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors({ ...errors, email: "" });
            }}
          />

          {errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email}</p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>

          <input
            type="password"
            className={`w-full border rounded-lg px-3 py-2 outline-none ${
              errors.password ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Example: xyz@123"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors({ ...errors, password: "" });
            }}
          />

          {errors.password && (
            <p className="text-xs text-red-500 mt-1">{errors.password}</p>
          )}

          <p className="text-xs text-gray-400 mt-1">
            Password must include uppercase, lowercase, number and special
            character.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-300"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="mt-4 text-center text-sm text-gray-600">
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="text-blue-600 font-medium hover:underline"
          >
            Register
          </Link>
        </p>

        {message && (
          <p className="mt-4 text-center text-sm text-gray-700">{message}</p>
        )}
      </form>
    </div>
  );
}

export default Login;