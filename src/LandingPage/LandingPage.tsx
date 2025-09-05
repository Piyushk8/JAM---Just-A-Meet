import{ useMemo } from "react";
import { motion } from "motion/react";

const VirtualHQLanding = () => {
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
      scale: 0.5 + Math.random() * 0.6,
      delay: Math.random() * 2,
    }));
  }, []);

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
                className="w-20 md:w-28 object-contain drop-shadow-lg"
                style={{ transform: `scale(${pos.scale})` }}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Hero Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-6">
        <motion.h1
          className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          Welcome to{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
            Virtual HQ
          </span>
        </motion.h1>
        <motion.p
          className="text-xl md:text-2xl text-gray-300 mb-8 font-light max-w-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          A 2D metaverse for your remote team — explore, collaborate, and have
          fun together.
        </motion.p>
        <motion.button
          className="bg-gradient-to-r from-cyan-500 to-blue-500 px-8 py-4 rounded-full text-white font-semibold shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Enter the Office 🚪
        </motion.button>
      </div>
    </div>
  );
};

export default VirtualHQLanding;
