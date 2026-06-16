import { jwtVerify, SignJWT } from "jose";
import { JWT_SECRET } from "./jwt";

const EMBED_TOKEN_TTL = "24h";

export interface EmbedTokenPayload {
  type: "embed";
  siteId: string;
  apiKey: string;
  parentHost: string;
}

export async function signEmbedToken(payload: Omit<EmbedTokenPayload, "type">) {
  return new SignJWT({ ...payload, type: "embed" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EMBED_TOKEN_TTL)
    .sign(JWT_SECRET);
}

export async function verifyEmbedToken(token: string): Promise<EmbedTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.type !== "embed") return null;
    if (
      typeof payload.siteId !== "string" ||
      typeof payload.apiKey !== "string" ||
      typeof payload.parentHost !== "string"
    ) {
      return null;
    }
    return {
      type: "embed",
      siteId: payload.siteId,
      apiKey: payload.apiKey,
      parentHost: payload.parentHost,
    };
  } catch {
    return null;
  }
}
