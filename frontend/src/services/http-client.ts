import axios, { AxiosInstance } from "axios";

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  HEADERS: {
    "Content-Type": "application/json",
  },
} as const;

const normalizedBaseUrl = API_CONFIG.BASE_URL.replace(/\/$/, "");

export const setAuthToken = (token: string) => {
  localStorage.setItem("authToken", token);
  httpClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem("authToken");
};

export const removeAuthToken = () => {
  localStorage.removeItem("authToken");
  delete httpClient.defaults.headers.common["Authorization"];
};

export const httpClient: AxiosInstance = axios.create({
  baseURL: normalizedBaseUrl,
  headers: API_CONFIG.HEADERS,
});

const token = getAuthToken();
if (token) {
  httpClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

httpClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

httpClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Clear ALL auth state (token + cached user) so components reading
      // localStorage don't act on a stale session.
      removeAuthToken();
      localStorage.removeItem("currentUser");
      localStorage.removeItem("userEmail");

      // Redirect to login preserving the intended destination, instead of
      // silently failing on exempted paths.
      const { pathname, search } = window.location;
      if (pathname !== "/login" && pathname !== "/signup") {
        const next = encodeURIComponent(pathname + search);
        window.location.href = `/login?next=${next}`;
      }
    }
    return Promise.reject(error);
  },
);

export default httpClient;
