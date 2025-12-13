import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createUser, loginUser, setAuthToken } from "@/services";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/utils/error";

interface SignUpFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  university: string;
}

interface LoginFormData {
  email: string;
  password: string;
}

interface UseAuthReturn {
  loading: boolean;
  signUp: (data: SignUpFormData) => Promise<void>;
  login: (data: LoginFormData) => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const signUp = useCallback(
    async (data: SignUpFormData) => {
      if (!data.firstName || !data.lastName || !data.email || !data.password || !data.university) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
          duration: 1500,
        });
        return;
      }

      setLoading(true);

      try {
        const userData = {
          name: `${data.firstName} ${data.lastName}`,
          email: data.email,
          university: data.university,
          password: data.password,
        };

        await createUser(userData);

        toast({
          title: "Success!",
          description: "Account created successfully! Please log in to continue.",
          className: "bg-green-500 text-white border-green-600",
          duration: 1500,
        });

        navigate("/login");
      } catch (error) {
        toast({
          title: "Error",
          description: getErrorMessage(error, "Failed to create account"),
          variant: "destructive",
          duration: 1500,
        });
      } finally {
        setLoading(false);
      }
    },
    [toast, navigate],
  );

  const login = useCallback(
    async (data: LoginFormData) => {
      if (!data.email || !data.password) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
          duration: 1500,
        });
        return;
      }

      setLoading(true);

      try {
        const loginResponse = await loginUser({
          email: data.email,
          password: data.password,
        });

        setAuthToken(loginResponse.access_token);

        localStorage.setItem("currentUser", JSON.stringify(loginResponse.user));
        localStorage.setItem("userEmail", loginResponse.user.email);

        window.dispatchEvent(new CustomEvent("userLogin"));

        toast({
          title: "Success!",
          description: "Logged in successfully. Welcome back!",
          className: "bg-green-500 text-white border-green-600",
          duration: 1500,
        });

        navigate("/explore");
      } catch (error) {
        toast({
          title: "Error",
          description: getErrorMessage(error, "Failed to log in"),
          variant: "destructive",
          duration: 1500,
        });
      } finally {
        setLoading(false);
      }
    },
    [toast, navigate],
  );

  return {
    loading,
    signUp,
    login,
  };
}
