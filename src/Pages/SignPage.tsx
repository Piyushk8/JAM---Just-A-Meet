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
    <div className="min-h-screen bg-white flex flex-col md:flex-row overflow-hidden relative">
      {/* Left Side: Graphic / World Preview */}
      <div className="relative w-full md:w-[55%] h-[40vh] md:h-screen bg-slate-900 overflow-hidden flex-shrink-0 shadow-xl z-0">
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
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-blue-900/40 to-cyan-900/50" />
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
                  className="w-16 md:w-24 object-contain drop-shadow-2xl"
                  style={{ transform: `scale(${pos.scale})`, imageRendering: "pixelated" }}
                />
              </motion.div>
            );
          })}
        </div>

        <div className="absolute bottom-10 left-0 w-full text-center px-6 z-10 hidden md:block">
          <h2 className="text-white text-4xl font-bold tracking-tight mb-3 drop-shadow-md">
            Virtual HQ
          </h2>
          <p className="text-blue-100 text-lg font-medium drop-shadow-md">
            The spatial office for remote teams.
          </p>
        </div>
      </div>

      {/* Right Side: Auth Content */}
      <div className="relative z-10 w-full md:w-[45%] flex flex-col items-center justify-center px-8 py-12 md:py-0 bg-white md:-ml-6 md:rounded-l-[40px] shadow-[-20px_0_40px_-10px_rgba(0,0,0,0.1)]">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="md:hidden text-center mb-8">
             <h2 className="text-slate-800 text-3xl font-bold tracking-tight mb-2">
              Virtual HQ
            </h2>
            <p className="text-slate-500 font-medium">
              The spatial office for remote teams.
            </p>
          </div>

          <motion.h1
            className="text-3xl font-bold mb-2 text-slate-800"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {isSignInPage ? "Welcome back" : "Get started"}
          </motion.h1>

          <motion.p
            className="text-slate-500 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {isSignInPage
              ? "Sign in to your workspace to see who's around."
              : "Create an account to join the virtual office."}
          </motion.p>

          {state.success && state.user ? (
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                   <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-emerald-800 font-semibold text-lg">
                  {state.user.mode === "signin"
                    ? "Signed in successfully"
                    : "Account created"}
                </p>
                <p className="text-emerald-600 mt-1">
                  Ready when you are,{" "}
                  <span className="font-bold">
                    {state.user.userName}
                  </span>
                </p>
              </div>

              <motion.button
                className="w-full bg-slate-900 text-white px-6 py-4 rounded-xl font-semibold shadow-md hover:shadow-xl transition-all"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/join")}
              >
                Enter the Office
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
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Username</label>
                <input
                  type="text"
                  name="username"
                  placeholder="Enter your username"
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3.5 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-slate-300"
                  required
                  autoComplete="username"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3.5 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all hover:border-slate-300"
                  required
                  autoComplete={
                    isSignInPage ? "current-password" : "new-password"
                  }
                />
              </motion.div>

              {state.error && (
                <motion.div
                  className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <svg className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <p className="text-sm text-rose-700 font-medium">{state.error}</p>
                </motion.div>
              )}

              <motion.div 
                className="pt-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <button
                  type="submit"
                  disabled={pending}
                  className="w-full py-3.5 rounded-xl text-white font-semibold shadow-md bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all relative overflow-hidden"
                >
                  <span className={`flex items-center justify-center ${pending ? 'opacity-0' : 'opacity-100'}`}>
                    {isSignInPage ? "Sign In" : "Create Account"}
                  </span>
                  {pending && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    </span>
                  )}
                </button>
              </motion.div>

              <motion.div
                className="text-center mt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                <p className="text-slate-500 text-sm">
                  {isSignInPage
                    ? "New to Virtual HQ? "
                    : "Already have an account? "}
                  <button
                    type="button"
                    className="text-blue-600 font-semibold hover:text-blue-700 hover:underline transition-colors"
                    onClick={() => setIsSignInPage(!isSignInPage)}
                  >
                    {isSignInPage ? "Create an account" : "Sign in here"}
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
