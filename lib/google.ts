import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { encryptToken, decryptToken } from "@/lib/crypto";

/**
 * Retrieve a valid Google OAuth2 client for a given userId.
 *
 * Reads the stored encrypted access_token / refresh_token from the Account table,
 * decrypts them via AES-256-GCM, creates an OAuth2 client, and — if the access token
 * has expired — refreshes it and persists the new encrypted tokens back to the database.
 */
export async function getGoogleClient(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account) {
    throw new Error("No Google account linked for this user");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  // Decrypt tokens after reading from Postgres
  const accessToken = decryptToken(account.access_token);
  const refreshToken = decryptToken(account.refresh_token);

  oauth2Client.setCredentials({
    access_token: accessToken ?? undefined,
    refresh_token: refreshToken ?? undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  // If the token is expired (or about to expire in 60 s), refresh it
  const now = Date.now();
  const expiresAt = account.expires_at ? account.expires_at * 1000 : 0;

  if (expiresAt - now < 60_000) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);

    // Persist refreshed tokens encrypted with AES-256-GCM
    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: encryptToken(credentials.access_token),
        expires_at: credentials.expiry_date
          ? Math.floor(credentials.expiry_date / 1000)
          : undefined,
        refresh_token: credentials.refresh_token
          ? encryptToken(credentials.refresh_token)
          : undefined,
      },
    });
  }

  return oauth2Client;
}
