import { useEffect, useState } from "react";
import "./App.css";
import { WelcomePage } from "./components/WelcomePage";
import { DashboardPage } from "./components/DashboardPage";
import { ThanksFormPage } from "./components/ThanksFormPage";
import { WrittenLettersPage } from "./components/WrittenLettersPage";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { AdminPage } from "./components/AdminPage";


function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isCheckingLogin, setIsCheckingLogin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  type Page = "dashboard" | "form" | "writtenLetters" | "admin";
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

  //add use effect : tells react to run the code that connects the component to firebase (goes to firebase, gets info abt who signed in)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => { //wait for firestore to return the member record
      setIsAdmin(false);
      if (user === null || user.email === null || user.emailVerified === false) {
        setCurrentUser(null);
        setIsCheckingLogin(false);
        return;
      }

      try {
        const memberReference = doc(db, "members", user.email);
        const memberSnapshot = await getDoc(memberReference);

        const member = memberSnapshot.data();

        if (member === undefined) {
          setCurrentUser(null);
          return;
        }

        if (typeof member.nickname !== "string") {
          setCurrentUser(null);
          return;
        }

        setCurrentUser(member.nickname);
        const adminReference = doc(db, "admin", user.email.toLowerCase());
        const adminDocument = await getDoc(adminReference);
        // Temporarily check which admin record Firebase returns.
        console.log("Admin email:", user.email.toLowerCase());
        console.log("Admin record:", adminDocument.data());


        if (adminDocument.exists()){
          const admin = adminDocument.data();
          setIsAdmin(admin.enabled === true);
        }else{setIsAdmin(false);}

      } catch (error) {
        console.error("Couldn't load the member record:", error);
      } finally {
        setIsCheckingLogin(false);
      }
    });

    return unsubscribe;
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    setCurrentPage("dashboard");
  };

  if (isCheckingLogin) {
    return (
      <div className="welcome-page">
        <p>Checking your login...</p>
      </div>
    );
  }

  if (currentUser === null) {
    return <WelcomePage onLogin={setCurrentUser} />;
  }

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
