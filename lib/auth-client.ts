"use client";

import { createAuthClient } from "better-auth/react";

// Same-origin client — talks to /api/auth/*. No React provider needed; the
// hooks (useSession) call the API directly.
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
