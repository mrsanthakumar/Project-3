import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { env } from "@/lib/env";

/**
 * jose is used (not jsonwebtoken) because it runs on the Edge runtime,
 * so the same verify logic works inside middleware.ts.
 */
const secret = new TextEncoder().encode(env.jwtSecret);

export interface AccessClaims extends JWTPayload {
  sub: string; // user id
  iid: string | null; // institution id (null for super admin)
  role: string; // role slug
  perms: string[]; // permission codes
  dept: string | null; // department id (HOD/advisor scope)
}

export async function signAccessToken(
  claims: Omit<AccessClaims, "iat" | "exp">,
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(env.jwtIssuer)
    .setExpirationTime(`${env.jwtAccessTtl}s`)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, secret, { issuer: env.jwtIssuer });
  return payload as AccessClaims;
}
