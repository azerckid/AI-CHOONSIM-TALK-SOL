import { createAuthClient } from "better-auth/react";

const getBaseURL = () => {
    if (typeof window !== "undefined") {
        return window.location.origin;
    }
    return process.env.BETTER_AUTH_URL || "http://localhost:5173";
};

export const authClient = createAuthClient({
    baseURL: getBaseURL(),
    basePath: "/auth",
});

export const { signIn, signUp, signOut, useSession } = authClient;
