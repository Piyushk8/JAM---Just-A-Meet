import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { JoinRoomDialog } from "./JoinRoomDialog";
import { useSelector } from "react-redux";
import type { RootState } from "@/Redux";

const VirtualHQLanding = () => {
  const [JoinRoom, setJoinRoom] = useState(false);
  const navigate = useNavigate();
  const cloudParts = [
    "assets/Clouds/Clouds 2/1.png",
    "assets/Clouds/Clouds 2/2.png",
    "assets/Clouds/Clouds 2/3.png",
    "assets/Clouds/Clouds 2/4.png",
  ];
  const { userInfo } = useSelector((state: RootState) => state.authSlice);
  
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
      scale: 0.5 + Math.random() * 0.6,
      delay: Math.random() * 2,
    }));
  }, []);
  const handleJoinRoom = () => {
    setJoinRoom(true);
  };

  return (
    <div className="min-h-screen overflow-hidden relative flex items-center justify-center bg-[#0d1b2a]">
      {/* Vibrant Background Gradients (Gather Town style sky/space) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1B263B] via-[#415A77] to-[#778DA9] opacity-80" />
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-400/20 via-blue-900/40 to-transparent mix-blend-overlay" />
      
      {/* Cloud Layers (Full Screen) */}
      <div className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none">
        {cloudParts.map((cloudPath, index) => (
          <motion.div
            key={index}
            className="absolute inset-0 will-change-transform"
            animate={{ x: [0, 60, 0], opacity: [0.5, 0.8, 0.5] }}
            transition={{
              duration: 30 + index * 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 2,
            }}
          >
            <img
              src={cloudPath}
              alt={`Cloud layer ${index + 1}`}
              className="w-[150%] h-[150%] object-cover -translate-x-1/4 -translate-y-1/4"
            />
          </motion.div>
        ))}
      </div>

      {/* Floating Characters (Spread across the entire screen) */}
      <div className="absolute inset-0 pointer-events-none">
        {characters.map((character, i) => {
          const pos = floatingPositions[i];
          return (
            <motion.div
              key={character.name}
              className="absolute will-change-transform"
              style={{ left: pos.left, top: pos.top }}
              animate={{
                y: [0, -25, 0],
                x: [0, 15, -15, 0],
                rotate: [0, 4, -4, 0],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 6 + i,
                repeat: Infinity,
                ease: "easeInOut",
                delay: pos.delay,
              }}
            >
              <div className="relative">
                <div className="absolute -inset-4 bg-white/20 rounded-full blur-xl opacity-0 animate-pulse" />
                <img
                  src={character.path}
                  alt={character.name}
                  className="w-24 md:w-32 lg:w-40 object-contain drop-shadow-[0_10px_15px_rgba(0,0,0,0.5)]"
                  style={{ transform: `scale(${pos.scale})`, imageRendering: "pixelated" }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Central Glassmorphic Card */}
      <div className="relative z-10 w-full max-w-2xl mx-4 p-8 md:p-12 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] flex flex-col items-center text-center">
        
        {/* Glow effect behind card */}
        <div className="absolute inset-0 rounded-[40px] shadow-[inset_0_0_80px_rgba(255,255,255,0.1)] pointer-events-none" />

        <div className="w-20 h-20 bg-gradient-to-tr from-cyan-400 to-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg border border-white/20">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight mb-4 drop-shadow-md">
            Welcome to <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-300 drop-shadow-sm">
              Virtual HQ
            </span>
          </h1>
          <p className="text-lg md:text-xl text-blue-100/90 mb-10 max-w-lg mx-auto font-medium">
            A 2D metaverse for your remote team. Explore, collaborate, and connect effortlessly in a vibrant virtual world.
          </p>
        </motion.div>

        <motion.div 
          className="w-full flex flex-col sm:flex-row gap-4 justify-center items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <button
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-2xl shadow-[0_8px_20px_rgba(6,182,212,0.4)] hover:shadow-[0_8px_25px_rgba(6,182,212,0.6)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 border border-white/10"
            onClick={() => navigate("/join")}
          >
            <span>Create a Space</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>

          <div className="w-full sm:w-auto" onClick={handleJoinRoom}>
            <JoinRoomDialog />
          </div>
        </motion.div>
      </div>
      
    </div>
  );
};

export default VirtualHQLanding;
