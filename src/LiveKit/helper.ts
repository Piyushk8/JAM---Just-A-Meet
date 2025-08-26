import { SERVER_URL } from "@/lib/consts";

export const fetchLiveKitToken = async (identity: string, room: string): Promise<string> => {
  console.log("token,",identity)
  const res = await fetch(`${SERVER_URL}/getToken?room=${room}&identity=${identity}`);
  const data = await res.json();
  return data.token;
};
