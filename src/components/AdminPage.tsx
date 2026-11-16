import { useEffect, useState } from "react";
import { collection, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { userList } from "../userNames";

type AdminLetter = {
  id: string;
  to: string;
  from: string;
  message: string;
  createdAt: number;
};

type AdminPageProps = {
  onBack: () => void;
};

function recipientLabel(name: string) {
  const user = userList.find((person) => person.realName === name);
  return (user?.displayName || name).toLowerCase();
}

export function AdminPage({ onBack }: AdminPageProps) {
  const [letters, setLetters] = useState<AdminLetter[]>([]);
  const [recipient, setRecipient] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    return onSnapshot(collection(db, "adminMessages"), (snapshot) => {
      const loaded = snapshot.docs.map((document) => {
        const data = document.data();
        return {
          id: document.id,
          to: data.to,
          from: data.from,
          message: data.message,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : 0,
        };
      });
      loaded.sort((first, second) => second.createdAt - first.createdAt);
      setLetters(loaded);
      setError("");
      setIsLoading(false);
    }, (cause) => {
      console.error("Couldn't load admin letters:", cause);
      setLetters([]);
      setError(cause.code === "permission-denied"
        ? "This account doesn't have access to admin letters."
        : "Couldn't load the letters. Please try again.");
      setIsLoading(false);
    });
  }, [attempt]);

  const recipients = [...new Set(letters.map((letter) => letter.to))]
    .sort((first, second) => recipientLabel(first).localeCompare(recipientLabel(second)));
  const visibleLetters = recipient ? letters.filter((letter) => letter.to === recipient) : letters;

  return (
    <div className="dashboard-page">
      <h2>all the letters</h2>

      {isLoading ? <p role="status">loading letters...</p> : error ? (
        <>
          <p role="alert">{error}</p>
          <button type="button" className="button-secondary" onClick={() => {
            setIsLoading(true);
            setError("");
            setAttempt((previous) => previous + 1);
          }}>try again</button>
        </>
      ) : (
        <>
          <div className="thanks-form admin-filter">
            <label htmlFor="admin-recipient">letters for:</label>
            <select id="admin-recipient" value={recipient} onChange={(event) => setRecipient(event.target.value)}>
              <option value="">everyone</option>
              {recipients.map((name) => <option key={name} value={name}>{recipientLabel(name)}</option>)}
            </select>
          </div>
          <p role="status">{visibleLetters.length} {visibleLetters.length === 1 ? "letter" : "letters"}</p>
          <section className="sent-letters" aria-label="all submitted letters">
            {visibleLetters.length === 0 && <p>no letters here yet</p>}
            {visibleLetters.map((letter) => (
              <article className="sent-letter" key={letter.id}>
                <div className="letter-heading">
                  <h3>to: {recipientLabel(letter.to)}</h3>
                  <span className="anonymous-label">from: {letter.from.toLowerCase()}</span>
                </div>
                <p className="letter-text">{letter.message}</p>
              </article>
            ))}
          </section>
        </>
      )}

      <button
        type="button"
        className="button-secondary"
        onClick={onBack}
      >
        back to dashboard
      </button>
    </div>
  );
}
