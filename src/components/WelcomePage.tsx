import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

type WelcomePageProps = {
  onLogin: (name: string) => void;
};

export function WelcomePage({ onLogin }: WelcomePageProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState("");
  {/* thing tha thandles the google sign in popup (not the validation} */}
  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setSignInError("");

    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
          const email = result.user.email;

          if (!email || !result.user.emailVerified) {
            await signOut(auth);
            setSignInError("Please use a verified Google account.");
            return;
          }

          const member = await getDoc(doc(db, "members", email));
          const nickname = member.data()?.nickname;

          if (!member.exists() || typeof nickname !== "string" || !nickname.trim()) {
            await signOut(auth);
            setSignInError("This account isn't on the approved member list.");
            return;
          }

          onLogin(nickname);
    } catch (error) {
      console.error("Google sign-in failed:", error);
      setSignInError("Couldn't sign in. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="welcome-page">
      <h1>HOWDYYYY HACKERS</h1>
      <h2>it is time to show your thankfulness!</h2>

      {/*button for signing in */}
      <button type = "button"
      className = "button-primary"
      onClick = {handleGoogleSignIn}
      disabled = {isSigningIn}>
        {isSigningIn ? "Signing in..." : "Sign in with Google"}
      </button>
      {signInError && <p role="alert">{signInError}</p>}

    
    </div>
  );
}