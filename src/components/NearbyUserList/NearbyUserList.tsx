import React from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../Redux";

interface NearbyUsersProps {}

const NearbyUsers: React.FC<NearbyUsersProps> = () => {
  const { nearbyParticipants,usersInRoom } = useSelector((state: RootState) => state.roomState);

  const nearbyUsers = Object.values(usersInRoom).filter((u)=>nearbyParticipants.includes(u.id))

  // Color mapping for availability
  const statusColors: Record<string, string> = {
    available: "bg-green-500",
    idle: "bg-green-500",
    away: "bg-yellow-500",
    busy: "bg-red-500",
    offline: "bg-gray-400",
  };
  return (
    <div className="fixed z-50 flex flex-col gap-2 p-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg
                    bottom-5 left-5 w-40 max-h-80 overflow-y-auto
                    md:bottom-5 md:left-5 sm:top-5 sm:right-5 sm:w-32">
      <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
        Nearby
      </h3>

      {nearbyUsers?.length ? (
        nearbyUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer"
          >
            <img
              src={user.sprite || "https://github.com/shadcn.png"}
              alt={user.username}
              className="w-8 h-8 rounded-full"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {user.username}
              </p>
            </div>
            <span
              className={`w-3 h-3 rounded-full ${
                statusColors[user.availability]
              }`}
            />
          </div>
        ))
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">No one nearby</p>
      )}
    </div>
  );
};

export default NearbyUsers;
