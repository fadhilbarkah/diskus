export const generateAvatarSeed = async (email: string | undefined): Promise<string> => {
  if (!email) return "guest";
  try {
    const msgUint8 = new TextEncoder().encode(email.trim().toLowerCase());
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch (_e) {
    return "guest";
  }
};
