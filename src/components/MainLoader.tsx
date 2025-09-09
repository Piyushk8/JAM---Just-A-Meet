import { motion } from "motion/react";

export default function MainLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-blue-950 relative">
      {/* Animated background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(255,255,255,0.8) 1px, transparent 2px),
            radial-gradient(circle at 75% 75%, rgba(255,255,255,0.6) 0.5px, transparent 1px),
            radial-gradient(circle at 50% 10%, rgba(255,255,255,1) 1.5px, transparent 2px),
            radial-gradient(circle at 10% 80%, rgba(255,255,255,0.4) 0.8px, transparent 1.5px),
            radial-gradient(circle at 90% 20%, rgba(255,255,255,0.9) 1px, transparent 2px),
            radial-gradient(circle at 30% 60%, rgba(255,255,255,0.5) 0.6px, transparent 1px),
            radial-gradient(circle at 80% 90%, rgba(255,255,255,0.7) 1.2px, transparent 2px),
            radial-gradient(circle at 15% 40%, rgba(255,255,255,0.3) 0.4px, transparent 1px),
            linear-gradient(360deg, hsla(228, 27%, 29%, 1) 19%, hsla(227, 82%, 4%, 1) 100%)
          `,
          backgroundSize:
            "300px 300px, 200px 200px, 400px 400px, 250px 250px, 350px 350px, 180px 180px, 320px 320px, 150px 150px, 100% 100%",
          backgroundPosition:
            "0 0, 100px 50px, 200px 100px, 50px 200px, 150px 0px, 250px 150px, 300px 50px, 0px 100px, 0 0",
          backgroundRepeat: "repeat",
        }}
      />

      {/* Loading container */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo with glow and scale animation */}
        <motion.div
          className="relative mb-2"
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: "easeInOut",
          }}
        >
          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(59, 130, 246, 0.5) 0%, transparent 70%)",
              filter: "blur(10px)",
            }}
            animate={{
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              repeat: Infinity,
              duration: 2,
              ease: "easeInOut",
            }}
          />
          
          {/* Logo */}
          <img
            src="/assets/Logos/BrandLogoWBG.webp"
            alt="Loading..."
            className="w-50 h-50 relative z-10"
          />
        </motion.div>

        {/* Loading dots */}
        <div className="flex space-x-2">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="w-3 h-3 bg-white rounded-full"
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                repeat: Infinity,
                duration: 1.5,
                ease: "easeInOut",
                delay: index * 0.2,
              }}
            />
          ))}
        </div>

        {/* Loading text */}
        <motion.p
          className="text-white text-sm mt-4 font-light tracking-wider"
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: "easeInOut",
          }}
        >
          Loading...
        </motion.p>
      </div>
    </div>
  );
}