import { motion } from "motion/react";

export default function MainLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-blue-950 relative">
      {/* Simplified background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(255,255,255,0.5) 1px, transparent 2px),
            linear-gradient(360deg, hsla(228, 27%, 29%, 1) 10%, hsla(227, 82%, 4%, 1) 100%)
          `,
          backgroundSize: "200px 200px, 100% 100%",
          backgroundRepeat: "repeat",
        }}
      />

      {/* Loading container */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo with minimal animation */}
        <motion.div
          className="relative mb-2"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        >
          <img
            src="/assets/Logos/BrandLogoWBG.webp"
            alt="Loading..."
            className="w-40 h-40 relative z-10"
          />
        </motion.div>

        {/* Simplified loading dots */}
        <div className="flex space-x-2">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="w-2 h-2 bg-white rounded-full"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{
                repeat: Infinity,
                duration: 1,
                ease: "easeInOut",
                delay: index * 0.15,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}