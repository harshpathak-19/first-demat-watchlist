import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "./Apii/authApi";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const getNameError = (name) => {
    const cleanName = name.trim();

    if (!cleanName) {
      return "Name is required";
    }

    if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(cleanName)) {
      return "Name should contain only letters and single spaces";
    }

    const words = cleanName.split(" ");

    const hasSmallWord = words.some((word) => word.length < 3);

    if (hasSmallWord) {
      return "Each name word must be at least 3 letters. Example: Harsh Raj";
    }

    return "";
  };

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

  const validateRegister = () => {
    const newErrors = {};

    const nameError = getNameError(name);

    if (nameError) {
      newErrors.name = nameError;
    }

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

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!validateRegister()) return;

    try {
      setLoading(true);
      setMessage("");

      const cleanName = name.trim().replace(/\s+/g, " ");

      const result = await registerUser({
        name: cleanName,
        email: email.trim(),
        password: password,
      });

      console.log("Register success:", result);

      setMessage("Registration successful. Please login now.");

      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (error) {
      console.error("Register error:", error);
      setMessage(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <form
        noValidate
        onSubmit={handleRegister}
        className="w-full max-w-sm bg-white p-6 rounded-xl shadow-md"
      >
        <h2 className="text-2xl font-bold mb-5 text-center text-gray-900">
          Register
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>

          <input
            type="text"
            className={`w-full border rounded-lg px-3 py-2 outline-none ${
              errors.name ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Enter your name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors({ ...errors, name: "" });
            }}
          />

          {errors.name && (
            <p className="text-xs text-red-500 mt-1">{errors.name}</p>
          )}
        </div>

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
          {loading ? "Registering..." : "Register"}
        </button>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-blue-600 font-medium hover:underline"
          >
            Login
          </Link>
        </p>

        {message && (
          <p className="mt-4 text-center text-sm text-gray-700">{message}</p>
        )}
      </form>
    </div>
  );
}

export default Register;