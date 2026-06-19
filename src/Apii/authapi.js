import { apiRequest } from "./CommonAPI";

export const registerUser = async (userData) => {
  return await apiRequest("/auth/register", {
    method: "POST",
    body: userData,
  });
};

export const loginUser = async (loginData) => {
  const result = await apiRequest("/auth/login", {
    method: "POST",
    body: loginData,
  });

  console.log("Login API Response:", result);

  const token =
    result.token ||
    result.access_token ||
    result.data?.token ||
    result.data?.access_token ||
    result.data?.jwt ||
    result.jwt;

  const userId =
    result.user?.id ||
    result.data?.user?.id ||
    result.data?.id ||
    result.user_id ||
    result.data?.user_id;

  if (!token) {
    throw new Error("Token not found in login response");
  }

  localStorage.setItem("token", token);

  if (userId) {
    localStorage.setItem("user_id", userId);
  }

  return result;
};

export const logoutUser = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user_id");
};