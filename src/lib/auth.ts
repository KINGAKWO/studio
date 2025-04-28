
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { FirestoreAdapter } from "@auth/firebase-adapter";
import { db } from "@/lib/firebase"; // Import the initialized Firestore instance

// Ensure NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and NEXTAUTH_URL
// are set in your .env file.

export const authOptions: NextAuthOptions = {
  // Secret for session encryption (required for JWT).
  secret: process.env.NEXTAUTH_SECRET,
  // Use database strategy with Firestore adapter
  session: {
    strategy: "database", // Changed from "jwt"
    maxAge: 30 * 24 * 60 * 60, // 30 days session validity
    updateAge: 24 * 60 * 60, // 24 hours to update session
  },
  adapter: FirestoreAdapter(db), // Use FirestoreAdapter
  providers: [
    GoogleProvider({
      // Ensure environment variables are correctly read.
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
       // Define profile scope explicitly if needed, otherwise defaults work
       authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    // Add other providers here if needed
  ],
  callbacks: {
    // Using database adapter simplifies callbacks, often JWT/session customization is less needed
    // async signIn({ user, account, profile, email, credentials }) {
    //   // Example: Allow sign in only for specific domains
    //   // if (account?.provider === "google" && user.email?.endsWith("@example.com")) {
    //   //   return true;
    //   // }
    //   // return false; // Return false to deny sign in
    //   return true; // Allow sign in for everyone by default
    // },
    async session({ session, user }) {
       // The adapter handles linking user ID to the session.
       // session.user already contains id, name, email, image from the database user record.
      if (session.user && user) {
        session.user.id = user.id; // Ensure user ID is explicitly added
      }
      return session;
    },
    // JWT callback is not needed when using database sessions unless you specifically want JWTs
    // async jwt({ token, account, profile }) {
    //   // ...
    //   return token;
    // },

    // Redirect callback can be useful for custom logic after sign-in/out
    // async redirect({ url, baseUrl }) {
    //   // Allows relative callback URLs
    //   if (url.startsWith("/")) return `${baseUrl}${url}`
    //   // Allows callback URLs on the same origin
    //   else if (new URL(url).origin === baseUrl) return url
    //   return baseUrl
    // }
  },
  // Add custom pages if needed
  // pages: {
  //   signIn: '/auth/signin', // Default: /api/auth/signin
  //   signOut: '/auth/signout',
  //   error: '/auth/error', // Error code passed in query string as ?error=
  //   verifyRequest: '/auth/verify-request', // (e.g. check email message)
  //   newUser: null // Redirect new users to the homepage instead of a specific page
  // }
  // Enable debug messages in development
  debug: process.env.NODE_ENV === 'development',
};

// Note: NEXTAUTH_URL is crucial for redirects and callback URLs to function correctly.
// Ensure it's set in your .env file.
