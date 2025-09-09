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
import { CheckCircle } from "lucide-react";
import type { RootState } from "@/Redux";
import type { RoomThemes } from "@/Pages/JoinRoom";

interface themeState {
  id: number;
  name: RoomThemes;
  image: string;
}
const themes: themeState[] = [
  { id: 1, name: "office 1", image: "/assets/Clouds/Clouds 1/1.png" },
  { id: 4, name: "larger office", image: "/assets/Clouds/Clouds 1/1.png" },
];

export function ThemeCarousel() {
  const dispatch = useDispatch();
  const selectedTheme = useSelector(
    (state: RootState) => state.roomState.roomTheme
  );

  const handleSelectTheme = (themeName: RoomThemes) => {
    dispatch(setRoomTheme(themeName));
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
                  onClick={() => handleSelectTheme(theme.name)}
                >
                  <CardContent className="flex flex-col items-center justify-center p-3">
                    <div className="relative w-full aspect-square">
                      {" "}
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
                    <h3 className="mt-2 text-lg font-medium">{theme.name}</h3>
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
