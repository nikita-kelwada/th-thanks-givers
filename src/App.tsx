import { useEffect, useState } from "react";
import "./App.css";
import { WelcomePage } from "./components/WelcomePage";
import { DashboardPage } from "./components/DashboardPage";
import { ThanksFormPage } from "./components/ThanksFormPage";
import { WrittenLettersPage } from "./components/WrittenLettersPage";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { AdminPage } from "./components/AdminPage";
import { watchAccountAccess } from "./accountAccess";
import type { AccountAccess } from "./accountAccess";


function App() {
  const [access, setAccess] = useState<AccountAccess>({ status: "loading" });
  const [accessAttempt, setAccessAttempt] = useState(0);

  type Page = "dashboard" | "form" | "writtenLetters" | "admin";
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

  useEffect(() => {
    return watchAccountAccess({
      subscribe: (callback) => onAuthStateChanged(auth, (user) => {
        setCurrentPage("dashboard");
        callback(user);
      }),
      readRecord: async (collection, email) => (await getDoc(doc(db, collection, email))).data(),
      publish: setAccess,
    });
  }, [accessAttempt]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Couldn't sign out:", error);
      setAccess({ status: "error", message: "Couldn't sign out. Please try again." });
    }
  };

  if (access.status === "loading") {
    return (
      <div className="welcome-page">
        <p role="status">checking your account...</p>
      </div>
    );
  }

  if (access.status === "error") {
    return (
      <div className="welcome-page">
        <p role="alert">{access.message}</p>
        <button type="button" className="button-primary" onClick={() => {
          setAccess({ status: "loading" });
          setAccessAttempt((previous) => previous + 1);
        }}>try again</button>
        <button type="button" className="button-secondary" onClick={handleLogout}>sign out</button>
      </div>
    );
  }

  if (access.status !== "ready") {
    return <WelcomePage accessError={access.status === "denied" ? access.message : ""} />;
  }

  const currentUser = access.nickname;
  const isAdmin = access.isAdmin;

  if (currentPage === "dashboard") {
    return (
      <DashboardPage
        currentUser={currentUser}
        onGoToForm={() => setCurrentPage("form")}
        onViewLetters={() => setCurrentPage("writtenLetters")}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        onViewAdmin={() => setCurrentPage("admin")}
      />
    );
  }

  if (currentPage === "form") {
    return (
      <ThanksFormPage
        currentUser={currentUser}
        onFormSubmit={() => setCurrentPage("dashboard")}
      />
    );
  }

  if (currentPage === "writtenLetters") {
    return (
      <WrittenLettersPage
        currentUser={currentUser}
        onBack={() => setCurrentPage("dashboard")}
      />
    );
  }
    // Show the admin page for approved admins.
    if (currentPage === "admin" && isAdmin === true) {
      return (<AdminPage
          onBack={() => setCurrentPage("dashboard")}/>
      );
    }

  return null;
}

export default App;
