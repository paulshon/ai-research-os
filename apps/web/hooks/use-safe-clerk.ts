"use client";

/* v15: Clerk 키 미설정(오프라인 Electron/로컬 모드)에서는 <ClerkProvider>가 없어
   useUser/useClerk/useAuth 호출이 즉시 throw → SSR 500. 키가 없으면 로컬 모드
   기본값을 돌려주는 안전 래퍼. hasClerk는 빌드 시점 상수이므로 렌더 간
   훅 호출 순서는 변하지 않는다(rules-of-hooks 안전). */

import {
  useUser as clerkUseUser,
  useClerk as clerkUseClerk,
  useAuth as clerkUseAuth,
} from "@clerk/nextjs";

const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

type SafeUser = ReturnType<typeof clerkUseUser>;

export function useSafeUser(): SafeUser {
  if (!hasClerk) {
    return { isLoaded: true, isSignedIn: false, user: null } as SafeUser;
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return clerkUseUser();
}

const noopClerk = {
  signOut: async () => {
    if (typeof window !== "undefined") window.location.href = "/";
  },
} as unknown as ReturnType<typeof clerkUseClerk>;

export function useSafeClerk(): ReturnType<typeof clerkUseClerk> {
  if (!hasClerk) return noopClerk;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return clerkUseClerk();
}

type SafeAuth = ReturnType<typeof clerkUseAuth>;

export function useSafeAuth(): SafeAuth {
  if (!hasClerk) {
    return {
      isLoaded: true,
      isSignedIn: false,
      userId: null,
      sessionId: null,
      orgId: null,
      getToken: async () => null,
    } as unknown as SafeAuth;
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return clerkUseAuth();
}

export { hasClerk };
