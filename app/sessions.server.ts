import { createCookieSessionStorage } from "react-router";

type SessionData = {
  userId: number;
  email: string;
};

type SessionFlashData = {
  error: string;
  success: string;
};

const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<SessionData, SessionFlashData>({
    cookie: {
      name: "__session",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      secrets: [process.env.SESSION_SECRET || "default-secret"],
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  });

export { getSession, commitSession, destroySession };
