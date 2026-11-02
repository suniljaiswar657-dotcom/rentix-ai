import { createAuthClient } from "@neondatabase/neon-js/auth";

const authUrl = import.meta.env.VITE_NEON_AUTH_URL;
if (!authUrl) throw new Error("VITE_NEON_AUTH_URL is not configured");

export const authClient = createAuthClient(authUrl);

export async function getAccessToken() {
  const result = await authClient.getSession();
  const session = result?.data?.session;
  return session?.access_token || session?.token || null;
}

export async function apiRequest(path, options = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error("Please sign in again.");
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body;
}
