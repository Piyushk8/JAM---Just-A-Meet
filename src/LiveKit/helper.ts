export const fetchLiveKitToken = async (identity: string, room: string): Promise<string> => {
  console.log("token,",identity)
  const res = await fetch(`http://localhost:3000/getToken?room=${room}&identity=${identity}`);
  const data = await res.json();
  return data.token;
};
