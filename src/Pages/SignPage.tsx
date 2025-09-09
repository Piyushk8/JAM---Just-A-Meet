import React, { useEffect, useState, useMemo } from "react";
import { motion } from "motion/react";
import axios from "axios";
import { SERVER_URL } from "@/lib/consts";
import { useDispatch } from "react-redux";
import { setUserInfo } from "@/Redux/auth";
import { useNavigate } from "react-router-dom";
import { connectSocket } from "@/socket";

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
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> => {
  try {
    const { username, password, mode } = getFormData<AuthFormFields>(formData);

    if (!username || !password || !mode) {
      return {
        success: false,
        error: "Username, password, and mode are required",
      };
    }

    let res;
    if (mode === "signin") {
      res = await axios.post(
        `${SERVER_URL}/api/v1/user/login`,
        { username, password },
        { withCredentials: true }
      );
    } else {
      res = await axios.post(
        `${SERVER_URL}/api/v1/user/signup`,
        { username, password },
        { withCredentials: true }
      );
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
  const [state, setState] = useState<AuthState>({
    success: false,
    error: null,
  });
  const [pending, setPending] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Cloud parts for background animation
  const cloudParts = [
    "assets/Clouds/Clouds 2/1.png",
    "assets/Clouds/Clouds 2/2.png",
    "assets/Clouds/Clouds 2/3.png",
    "assets/Clouds/Clouds 2/4.png",
  ];

  const characters = [
    { name: "Adam", path: "assets/character/single/Adam_idle_anim_2.png" },
    { name: "Ash", path: "assets/character/single/Ash_idle_anim_2.png" },
    { name: "Lucy", path: "assets/character/single/Lucy_idle_anim_2.png" },
    { name: "Nancy", path: "assets/character/single/Nancy_idle_anim_2.png" },
  ];

  // Stable random positions only generated once
  const floatingPositions = useMemo(() => {
    return characters.map(() => ({
      left: `${10 + Math.random() * 70}%`, // spread horizontally
      top: `${20 + Math.random() * 50}%`, // spread vertically
      scale: 0.4 + Math.random() * 0.4,
      delay: Math.random() * 2,
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);

    setState((prev) => ({ ...prev, error: null }));

    try {
      const formData = new FormData(e.currentTarget);

      const result = await formHandler(state, formData);
      if (result.success === true && result.user?.id) {
        connectSocket(result.user?.id.toString());
      }
      setState(result);
    } catch (error) {
      setState({
        success: false,
        error: "An unexpected error occurred during submission",
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
      setTimeout(() => {
        navigate("/");
      }, 1000);
    }
  }, [state, dispatch, navigate]);
  useEffect(() => {
    setState({ success: false, error: null });
  }, [isSignInPage]);

  return (
    <div className="min-h-screen bg-slate-900 overflow-hidden relative">
      {/* Cloud Layers */}
      <div className="absolute inset-0">
        {cloudParts.map((cloudPath, index) => (
          <motion.div
            key={index}
            className="absolute inset-0 will-change-transform"
            animate={{ x: [0, 40, 0], opacity: [0.7, 1, 0.7] }}
            transition={{
              duration: 20 + index * 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 2,
            }}
          >
            <img
              src={cloudPath}
              alt={`Cloud layer ${index + 1}`}
              className="w-full h-full object-cover"
              style={{
                mixBlendMode: index % 2 === 0 ? "normal" : "overlay",
              }}
            />
          </motion.div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-blue-900/50 to-cyan-900/60" />
      </div>

      {/* Floating Characters */}
      <div className="absolute inset-0 pointer-events-none">
        {characters.map((character, i) => {
          const pos = floatingPositions[i];
          return (
            <motion.div
              key={character.name}
              className="absolute will-change-transform"
              style={{ left: pos.left, top: pos.top }}
              animate={{
                y: [0, -20, 0],
                x: [0, 10, -10, 0],
                rotate: [0, 3, -3, 0],
                opacity: [0.9, 1, 0.9],
              }}
              transition={{
                duration: 6 + i,
                repeat: Infinity,
                ease: "easeInOut",
                delay: pos.delay,
              }}
            >
              <img
                src={character.path}
                alt={character.name}
                className="w-16 md:w-20 object-contain drop-shadow-lg"
                style={{ transform: `scale(${pos.scale})` }}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Auth Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        <motion.div
          className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/20"
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.h1
            className="text-3xl font-bold mb-2 text-center text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Welcome to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              Virtual HQ
            </span>
          </motion.h1>

          <motion.p
            className="text-center text-gray-300 mb-6 font-light"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {isSignInPage
              ? "Sign in to your workspace"
              : "Create your workspace"}
          </motion.p>

          {state.success && state.user ? (
            <motion.div
              className="text-center space-y-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="p-4 bg-green-500/20 border border-green-400/30 rounded-xl backdrop-blur-sm">
                <p className="text-green-300 font-semibold text-lg">
                  {" "}
                  {state.user.mode === "signin"
                    ? "Welcome back"
                    : "Account created"}
                  !
                </p>
                <p className="text-white mt-2">
                  Hello,{" "}
                  <span className="font-bold text-cyan-300">
                    {state.user.userName}
                  </span>
                </p>
              </div>

              <motion.button
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 rounded-xl text-white font-semibold shadow-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/join")}
              >
                Enter the Office 🚪
              </motion.button>
            </motion.div>
          ) : (
            <motion.form
              onSubmit={handleSubmit}
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <input
                type="hidden"
                name="mode"
                value={isSignInPage ? "signin" : "signup"}
              />

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  className="w-full bg-white/10 border border-white/20 p-4 rounded-xl text-white placeholder-gray-300 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-all"
                  required
                  autoComplete="username"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  className="w-full bg-white/10 border border-white/20 p-4 rounded-xl text-white placeholder-gray-300 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-transparent transition-all"
                  required
                  autoComplete={
                    isSignInPage ? "current-password" : "new-password"
                  }
                />
              </motion.div>

              {state.error && (
                <motion.div
                  className="p-3 bg-red-500/20 border border-red-400/30 rounded-xl backdrop-blur-sm"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-sm text-red-300">{state.error}</p>
                </motion.div>
              )}

              <motion.button
                type="submit"
                disabled={pending}
                className={`w-full py-4 rounded-xl text-white font-semibold shadow-lg transition-all backdrop-blur-sm ${
                  isSignInPage
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                whileHover={!pending ? { scale: 1.02 } : {}}
                whileTap={!pending ? { scale: 0.98 } : {}}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                {pending ? (
                  <span className="flex items-center justify-center">
                    <motion.div
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mr-3"
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    />
                    {isSignInPage ? "Signing in..." : "Signing up..."}
                  </span>
                ) : isSignInPage ? (
                  "Sign In "
                ) : (
                  "Sign Up "
                )}
              </motion.button>

              <motion.div
                className="text-center mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                <p className="text-gray-300">
                  {isSignInPage
                    ? "New to Virtual HQ? "
                    : "Already have an account? "}
                  <button
                    type="button"
                    className="text-cyan-400 underline hover:text-cyan-300 font-medium transition-colors"
                    onClick={() => setIsSignInPage(!isSignInPage)}
                  >
                    {isSignInPage ? "Create account" : "Sign in"}
                  </button>
                </p>
              </motion.div>
            </motion.form>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default SignPage;
