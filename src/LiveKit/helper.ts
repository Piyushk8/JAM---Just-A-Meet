export const fetchLiveKitToken = async (identity: string, room: string): Promise<string> => {
  const res = await fetch(`http://localhost:3000/getToken?room=${room}&identity=${identity}`);
  const data = await res.json();
  console.log("token,",data)
  return data.token;
};
