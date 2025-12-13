import { useState, useCallback } from "react";

interface UsePasswordToggleReturn {
  showPassword: boolean;
  togglePassword: () => void;
}

export function usePasswordToggle(): UsePasswordToggleReturn {
  const [showPassword, setShowPassword] = useState(false);

  const togglePassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  return {
    showPassword,
    togglePassword,
  };
}
