import React, { useEffect, useRef } from "react";
import nipplejs from "nipplejs";

interface JoystickProps {
  onMove: (data: { x: number; y: number }) => void;
  onEnd?: () => void;
  position?: { left?: string; right?: string; top?: string; bottom?: string };
  color?: string;
  size?: number;
}

const Joystick: React.FC<JoystickProps> = ({
  onMove,
  onEnd,
  color = "rgba(50, 50, 50, 0.5)",
  size = 100,
}) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<any>(null);

  useEffect(() => {
    if (!joystickRef.current) return;

    const manager = nipplejs.create({
      zone: joystickRef.current,
      mode: "static",
      position: { left: "50%", top: "50%" },
      color: color,
      size: size,
      threshold: 0.1,
      fadeTime: 250,
    });

    managerRef.current = manager;

    manager.on("move", (_evt, data) => {
      if (data && data.distance && data.angle) {
        const { distance, angle } = data;

        //To Normalize distance (nipplejs gives distance in pixels)
        const normalizedDistance = Math.min(distance / (size / 2), 1);

        const x = normalizedDistance * Math.cos(angle.radian);
        const y = -normalizedDistance * Math.sin(angle.radian); // Invert Y for game coords

        onMove({ x, y });
      }
    });
    manager.on("end", () => {
      if (onEnd) {
        onEnd();
      }
    });

    return () => {
      if (managerRef.current) {
        managerRef.current.destroy();
        managerRef.current = null;
      }
    };
  }, [onMove]);

  return (
    <div
      ref={joystickRef}
      style={{
        position: "absolute",
        width: "100px",
        height: "100px",
        left: "50px",
        bottom: "50px",
        zIndex: 1000,
        pointerEvents: "auto",
      }}
      className="touch-none select-none"
    />
  );
};

export default Joystick;
