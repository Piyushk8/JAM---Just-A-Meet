import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { setRoomTheme } from "@/Redux/roomState";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { CheckCircle, LockKeyhole } from "lucide-react";
import type { RootState } from "@/Redux";
import type { RoomThemes } from "@/Pages/JoinRoom";
import { motion } from "motion/react";
interface themeState {
  id: number;
  name: RoomThemes;
  image: string;
  locked: boolean;
  description: string;
}
const themes: themeState[] = [
  {
    id: 1,
    name: "office 1",
    image: "/assets/map/Office 1.webp",
    locked: false,
    description: "Spacious sky office with soothing ambiance.",
  },
  {
    id: 2,
    name: "larger office 1",
    image: "/assets/map/LargerOffice 1.webp",
    locked: false,
    description: "Expand your workspace—perfect for larger groups.",
  },
  {
    id: 4,
    name: "larger office 2",
    image: "/assets/map/LargerOffice 1.webp",
    locked: true,
    description: "Premium large multi event arena for Events and conferences",
  },
];


export function ThemeCarousel() {
  const dispatch = useDispatch();
  const selectedTheme = useSelector(
    (state: RootState) => state.roomState.roomTheme
  );

  const handleSelectTheme = (theme: themeState) => {
    if (!theme.locked) {
      dispatch(setRoomTheme(theme.name));
    }
  };

  return (
    <Carousel className="w-full">
      <CarouselContent className="w-full">
        {themes.map((theme) => {
          const isSelected = selectedTheme === theme.name;

          return (
            <CarouselItem key={theme.id} className="w-1/2">
              {" "}
              {/* Each item takes half the screen width */}
              <div className="p-2">
                <Card
                  className={`cursor-pointer hover:shadow-lg transition-shadow relative ${
                    isSelected ? "border-2 border-blue-500" : ""
                  }`}
                  onClick={() => handleSelectTheme(theme)}
                >
                  <CardContent className="flex flex-col items-center justify-center p-3">
                    <div className="relative w-full aspect-square">
                      {theme.locked && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            className="bg-white/90 backdrop-blur-sm rounded-full p-3"
                          >
                            <LockKeyhole className="w-6 h-6 text-gray-700" />
                          </motion.div>
                        </div>
                      )}{" "}
                      {/* Full width with square ratio */}
                      <img
                        src={theme.image}
                        alt={theme.name}
                        className="w-full h-full object-cover rounded-md"
                      />
                      {isSelected && (
                        <CheckCircle className="absolute top-2 right-2 text-blue-600 bg-white rounded-full" />
                      )}
                    </div>
                    <h3 className="mt-4 font-mono text-center text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {theme.name}
                    </h3>

                    <div className="max-w-sm p-4 bg-gray-200/50 backdrop-blur-3xl rounded-lg border border-gray-300 shadow-sm">
                      <p className="text-sm text-slate-800 text-center font-mono">
                        {theme.description}
                      </p>
                      {theme.locked && (
                        <p className="text-xs text-gray-500 text-center mt-2 italic">
                          Coming soon
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
}
