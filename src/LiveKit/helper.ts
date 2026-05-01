import { SERVER_URL } from "@/lib/consts";

export const fetchLiveKitToken = async (
  identity: string,
  room: string
): Promise<string> => {
  const res = await fetch(
    `${SERVER_URL}/getToken?room=${encodeURIComponent(
      room
    )}&identity=${encodeURIComponent(identity)}`
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch LiveKit token: ${res.status}`);
  }
  const data = await res.json();
  if (!data?.token) {
    throw new Error("LiveKit token response was missing a token");
  }
  return data.token;
};
