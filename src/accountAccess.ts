type AccountUser = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
};

export type AccountAccess =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "denied"; message: string }
  | { status: "error"; message: string }
  | { status: "ready"; nickname: string; isAdmin: boolean };

type AccessDependencies = {
  subscribe: (callback: (user: AccountUser | null) => void) => () => void;
  readRecord: (collection: "members" | "admin", email: string) => Promise<Record<string, unknown> | undefined>;
  publish: (access: AccountAccess) => void;
};

export function watchAccountAccess({ subscribe, readRecord, publish }: AccessDependencies) {
  let generation = 0;
  let active = true;

  const unsubscribe = subscribe((user) => {
    const request = ++generation;
    const isCurrent = () => active && request === generation;

    if (!user) {
      publish({ status: "signedOut" });
      return;
    }
    if (!user.email || !user.emailVerified) {
      publish({ status: "denied", message: "Please use a verified Google account." });
      return;
    }

    publish({ status: "loading" });
    const email = user.email.toLowerCase();
    void Promise.allSettled([readRecord("members", email), readRecord("admin", email)])
      .then(([memberResult, adminResult]) => {
        if (!isCurrent()) return;
        if (memberResult.status === "rejected") throw memberResult.reason;
        const member = memberResult.value;
        if (typeof member?.nickname !== "string" || !member.nickname.trim()) {
          publish({ status: "denied", message: "This account isn't on the approved member list." });
          return;
        }
        if (adminResult.status === "rejected") throw adminResult.reason;
        const admin = adminResult.value;
        // Publish identity and admin access together, after both checks finish.
        publish({ status: "ready", nickname: member.nickname, isAdmin: admin?.enabled === true });
      })
      .catch((error: unknown) => {
        if (!isCurrent()) return;
        console.error("Couldn't check account access:", error);
        publish({ status: "error", message: "Couldn't check your account access. Please try again." });
      });
  });

  return () => {
    active = false;
    ++generation;
    unsubscribe();
  };
}
