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
import { motion } from "motion/react";
import type { RoomTheme } from "@/types/roomTypes";
import { RoomSetupStorage } from "@/lib/sessionStorage";
interface IThemeState {
  displayName: string;
  image: string;
  locked: boolean;
  description: string;
  db_name: RoomTheme;
}
export const RoomThemesConfig: Record<RoomTheme, IThemeState> = {
  basicoffice: {
    displayName: "Compact Office",
    image: "/assets/map/Office 1.webp",
    description: "Spacious sky office with soothing ambiance.",
    locked: false,
    db_name: "basicoffice",
  },

  largeoffice: {
    displayName: "Executive Office & Lobby",
    image: "/assets/map/LargerOffice 1.webp",
    description: "Perfect for larger teams and events.",
    locked: false,
    db_name: "largeoffice",
  },
};

export function ThemeCarousel() {
  const dispatch = useDispatch();
  const selectedTheme = useSelector(
    (state: RootState) => state.roomState.roomTheme
  );

  const handleSelectTheme = (theme: IThemeState) => {
    if (!theme.locked) {
      // persisted theme name for later use
      RoomSetupStorage.set({ mode: "create", roomTheme:theme.db_name });

      console.log(
        "theme",
        RoomSetupStorage.get().roomName,
        RoomSetupStorage.get().roomTheme
      );
      dispatch(setRoomTheme(theme.db_name));
    }
  };

  return (
    <Carousel className="w-full">
      <CarouselContent className="w-full">
        {Object.values(RoomThemesConfig).map((theme) => {
          const isSelected = selectedTheme === theme.db_name;

          return (
            <CarouselItem key={theme.description} className="w-1/2">
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
                        alt={theme.displayName}
                        className="w-full h-full object-cover rounded-md"
                      />
                      {isSelected && (
                        <CheckCircle className="absolute top-2 right-2 text-blue-600 bg-white rounded-full" />
                      )}
                    </div>
                    <h3 className="mt-4 font-mono text-center text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {theme.displayName}
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
