import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import axios from "axios";
import { SERVER_URL } from "@/lib/consts";
import { useDispatch } from "react-redux";
import { setUserInfo } from "@/Redux/auth";

type AuthState = {
  success: boolean;
  error: string | null;
  user?: { id: number; userName: string; mode: "signin" | "signup" };
};

type AuthFormFields = {
  username: string;
  password: string;
  mode: "signin" | "signup";
};

// Helper to convert FormData -> typed object
function getFormData<T extends Record<string, any>>(formData: FormData): T {
  const obj: Record<string, any> = {};
  formData.forEach((value, key) => {
    obj[key] = value;
  });
  return obj as T;
}

const formHandler = async (
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> => {
  try {
    // Debug: Log FormData contents properly
    console.log("FormData entries:");
    for (const [key, value] of formData.entries()) {
      console.log(key, value);
    }

    const { username, password, mode } = getFormData<AuthFormFields>(formData);
    
    // Validate required fields
    if (!username || !password || !mode) {
      return { 
        success: false, 
        error: "Username, password, and mode are required" 
      };
    }

    console.log("Extracted data:", { username, password, mode });

    let res;
    if (mode === "signin") {
      res = await axios.post(`${SERVER_URL}/api/v1/user/login`, { username, password });
    } else {
      res = await axios.post(`${SERVER_URL}/api/v1/user/signup`, { username, password });
    }

    if (res.data.success) {
      const userData = res.data.data;
      return {
        success: true,
        error: null,
        user: userData
          ? { id: userData.id, userName: userData.username, mode }
          : undefined,
      };
    }

    return { success: false, error: res.data.message || "Unknown error" };
  } catch (err) {
    console.error("Form handler error:", err);
    if (axios.isAxiosError(err) && err.response?.data?.message) {
      return { success: false, error: err.response.data.message };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
};

const SignPage = () => {
  const [isSignInPage, setIsSignInPage] = useState(true);
  const [state, setState] = useState<AuthState>({ success: false, error: null });
  const [pending, setPending] = useState(false);
  const dispatch = useDispatch();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    
    // Clear previous error state
    setState(prev => ({ ...prev, error: null }));
    
    try {
      const formData = new FormData(e.currentTarget);
      
      // Debug: Check if form data is being created properly
      console.log("Form element:", e.currentTarget);
      console.log("Form data size:", Array.from(formData.entries()).length);
      
      const result = await formHandler(state, formData);
      setState(result);
    } catch (error) {
      console.error("Submit error:", error);
      setState({ 
        success: false, 
        error: "An unexpected error occurred during submission" 
      });
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    if (state.success && state.user) {
      dispatch(
        setUserInfo({
          id: state.user.id.toString(),
          username: state.user.userName,
        })
      );
    }
  }, [state, dispatch]);

  // Reset state when switching between sign in/up
  useEffect(() => {
    setState({ success: false, error: null });
  }, [isSignInPage]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <motion.div
        className="bg-white rounded-2xl shadow-xl p-6 w-96"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-bold mb-4 text-center">Welcome 👋</h1>

        {state.success && state.user ? (
          <div className="text-center space-y-2">
            <p className="text-green-600 font-semibold">
              ✅ {state.user.mode === "signin" ? "Signed in" : "Signed up"} as{" "}
              {state.user.userName}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="hidden"
              name="mode"
              value={isSignInPage ? "signin" : "signup"}
            />
            <input
              type="text"
              name="username"
              placeholder="Username"
              className="w-full border p-2 rounded-lg"
              required
              autoComplete="username"
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              className="w-full border p-2 rounded-lg"
              required
              autoComplete={isSignInPage ? "current-password" : "new-password"}
            />

            {state.error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{state.error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className={`w-full py-2 rounded-lg text-white font-medium transition-opacity ${
                isSignInPage ? "bg-blue-500 hover:bg-blue-600" : "bg-green-500 hover:bg-green-600"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {pending
                ? isSignInPage
                  ? "Signing in..."
                  : "Signing up..."
                : isSignInPage
                ? "Sign In"
                : "Sign Up"}
            </button>

            <div className="text-center mt-2">
              {isSignInPage ? (
                <>
                  New user?{" "}
                  <button
                    type="button"
                    className="text-blue-500 underline hover:text-blue-600"
                    onClick={() => setIsSignInPage(false)}
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already a user?{" "}
                  <button
                    type="button"
                    className="text-blue-500 underline hover:text-blue-600"
                    onClick={() => setIsSignInPage(true)}
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default SignPage;