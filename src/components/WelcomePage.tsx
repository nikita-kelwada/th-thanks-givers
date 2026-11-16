import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebaseConfig";

type WelcomePageProps = {
  accessError?: string;
};

export function WelcomePage({ accessError = "" }: WelcomePageProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState("");
  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setSignInError("");

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google sign-in failed:", error);
      setSignInError("Couldn't sign in. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="welcome-page">
      <main className="welcome-content">
        <h1>HOWDYYYY HACKERS</h1>
        <h2>it’s time to show your appreciation!</h2>
        <div className="welcome-intro">
          <p>
            Tell your fellow directors what you appreciate about them!
          </p>
          <p>
            Write as many notes as you want, short or long!
            <br />
            They’ll be delivered at Friendsgiving!
          </p>
        </div>
        <p className="welcome-deadline">
          <span>write your notes by</span>
          <strong>Thursday, Nov. 19 at 11:59 PM</strong>
        </p>

        <p className="welcome-signin-note">please sign in with your personal email!</p>
        <button
          type="button"
          className="button-primary"
          onClick={handleGoogleSignIn}
          disabled={isSigningIn}
        >
          {isSigningIn ? "Signing in..." : "Sign in with Google"}
        </button>
        {(signInError || accessError) && <p role="alert">{signInError || accessError}</p>}
      </main>
    </div>
  );
}
