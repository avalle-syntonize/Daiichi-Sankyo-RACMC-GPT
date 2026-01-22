import NextAuth, { NextAuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { getServerSession } from "next-auth/next"
import { redirect } from 'next/navigation';
import userService from './services/server/user.service';
import { SessionUser, UserApp } from './dtos/user.dto';
// import { redirect } from 'next/navigation';
// import { cookies } from 'next/headers'

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    //idToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    provider?: string;
    accessToken?: string;
    //idToken?: string;
  }
}

const authOptions: NextAuthOptions = {
  pages: {
    signIn: '/',
    signOut: '/signout',
    error: '/error',
    verifyRequest: '/verify',
    // newUser: '/new-user',
  },
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID as string,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET as string,
      tenantId: process.env.AZURE_AD_TENANT_ID as string,
      authorization: { params: { prompt: "select_account" }},
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60 // 24h
  },
  jwt: {
    maxAge: 24 * 60 * 60 // 24h
  },
  secret: process.env.NEXTAUTH_SECRET as string,
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }



      if (url === baseUrl) {
        return `${baseUrl}/chatbot`;
      }

      
      return baseUrl;
    },
    async signIn(session) {

      // const userInfo = await userService.getUserInfoFromToken(session.account?.access_token as string);

      const isValid = true //userInfo ? true : false;

      const user: SessionUser = session.user as SessionUser;

      // if (isValid) {
      //   user.email = userInfo?.userPrincipalName as string;
      //   user.name = userInfo?.displayName as string;
      //   user.id = userInfo?.id as string;
      //   user.type = userInfo?.jobTitle as string;
      //   user.roles = userInfo?.roles as string[];
      //   session.user = user
      // }

      return isValid;
    },
    async jwt({ token, account }) {
      if (account) {
        //token.idToken = account.id_token as string;
        token.accessToken = account.access_token as string;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      //session.idToken = token.idToken as string;
      //   cookies().set('idToken', session.idToken);
      return session;
    },
  },
};




export const getSession = async (redirectTo = true) => {
  const session = await getServerSession(authOptions)

  //if (!session && redirectTo) redirect('/')

  if(!session) return null;

  // const isSessionAlive = await userService.getUserInfoFromToken(session.accessToken as string);

  // if (!isSessionAlive && redirectTo) redirect("/signout");
  
  // if (!isSessionAlive) return null

  return {
    ...session,
    user: {
      ...session.user,
      // type: isSessionAlive.jobTitle,
      // roles: isSessionAlive.roles
    }
  }
}

export const handler = NextAuth({
  ...authOptions,
  debug: process.env.NODE_ENV !== "production",
  logger: {
    error(code, ...message) {
      console.error(code, message)
    },
    warn(code, ...message) {
      console.warn(code, message)
    },
    debug(code, ...message) {
      console.debug(code, message)
    },
  },
});


