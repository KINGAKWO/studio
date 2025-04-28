
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// IMPORTANT: Ensure NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and NEXTAUTH_URL
// are set in your .env file or environment variables.
// The app will not function correctly without them.

export const authOptions: NextAuthOptions = {
  // Secret for session encryption (required for JWT).
  // It's recommended to set this in the .env file.
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt", // Using JSON Web Tokens for session management
  },
  providers: [
    GoogleProvider({
      // Ensure environment variables are correctly read.
      // The '!' asserts that the value will be present,
      // make sure they are defined in your .env file.
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // Add other providers here if needed
  ],
  callbacks: {
    // async signIn({ user, account, profile, email, credentials }) {
    //   // Example: Allow sign in only for specific domains
    //   // if (account?.provider === "google" && user.email?.endsWith("@example.com")) {
    //   //   return true;
    //   // }
    //   // return false; // Return false to deny sign in
    //   return true; // Allow sign in for everyone by default
    // },
    async jwt({ token, account, profile }) {
      // Persist the OAuth access_token and provider to the token right after signin
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider; // Store the provider
      }
      // Add user id to the token
      if (profile) {
        // Depending on the provider, the ID might be in 'sub' or another field
        // Use optional chaining and nullish coalescing for safety
        token.id = profile.sub ?? token.sub ?? profile.id ?? token.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client, like access_token and user ID from the token.
      // Ensure session.user exists
      if (session.user && token.id) {
         // Assign user ID from token to session user object
         // Ensure the session user type includes 'id' or cast appropriately
         (session.user as { id?: string | unknown }).id = token.id;
      }
       // The default session callback already adds basic user info (name, email, image).
       // If you need more specific data from the token, assign it here.
      (session as { accessToken?: string | unknown }).accessToken = token.accessToken; // Type assertion might be needed

      return session;
    },
    // You can add other callbacks like redirect if needed
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
  //   signIn: '/auth/signin',
  //   signOut: '/auth/signout',
  //   error: '/auth/error', // Error code passed in query string as ?error=
  //   verifyRequest: '/auth/verify-request', // (e.g. check email message)
  //   newUser: '/auth/new-user' // New users will be directed here on first sign in (leave the property out to disable)
  // }
  // Enable debug messages in development
  debug: process.env.NODE_ENV === 'development',
};

// Ensure NEXTAUTH_URL is set in environment variables, especially for production.
// NextAuth uses this for constructing redirect URLs.
// Example: NEXTAUTH_URL=http://localhost:3000 for development
// Example: NEXTAUTH_URL=https://yourdomain.com for production

```