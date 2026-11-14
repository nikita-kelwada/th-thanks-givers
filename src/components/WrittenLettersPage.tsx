import { useState, useEffect } from "react";
import { auth, db } from "../firebaseConfig";
import { userList } from "../userNames";
import {
  collection,
  query,
  where,
  or,
  getDocs,
  Timestamp,
} from "firebase/firestore";

type SentMessage = {
  id: string;
  to: string;
  message: string;
  from: string;
  createdAt: number;
};

function recipientLabel(name: string) {
  const recipient = userList.find((user) => user.realName === name);
  return (recipient?.displayName || name).toLowerCase();
}

//changed from dashboard
type WrittenLettersPageProps = {
  currentUser: string;
  onBack: () => void;
};

//updated for written letters
export function WrittenLettersPage({
  currentUser,
  onBack,
}: WrittenLettersPageProps) {
  const [messages, setMessages] = useState<SentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchMessages = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const messagesCollection = collection(db, "messages");
        // Get the signed in account.
        const signedInUser = auth.currentUser;

        // Stop if nobody is signed in.
        if (signedInUser === null) {
          setIsLoading(false);
          return;
        }

        const q = query(
          messagesCollection,
          or(
            // Find older letters saved with your nickname
            where("from", "==", currentUser),
            // Find letters by account ID including the anonymous ones
            where("senderId", "==", signedInUser.uid),
          ),
        );
        const snapshot = await getDocs(q);

        // Turn each Firebase document into a letter.
        const loadedMessages = snapshot.docs.map((document) => {
          const data = document.data();

          return {
            id: document.id,
            to: data.to,
            message: data.message,
            from: data.from,
            createdAt: data.createdAt instanceof Timestamp
              ? data.createdAt.toMillis()
              : 0,
          };
        });

        // Show the newest letters first.
        loadedMessages.sort((first, second) => second.createdAt - first.createdAt);

        if (active) {
          setMessages(loadedMessages);
        }
      } catch (error) {
        console.error("Couldn't load your letters:", error);
        if (active) {
          setMessages([]);
          setLoadError("Couldn't load your letters. Please refresh to try again.");
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    fetchMessages();

    // Ignore results if you leave this page during loading.
    return () => {
      active = false;
    };
  }, [currentUser]);

  return (
    <div className="dashboard-page">
      <h2>your written letters!</h2>

      {isLoading ? (
        <p role="status">loading your letters...</p>
      ) : loadError ? (
        <p role="alert">{loadError}</p>
      ) : (
        <p>
          you've written <strong>{messages.length}</strong> thank you notes so far
        </p>
      )}

      {!isLoading && !loadError && (
        <section className="sent-letters" aria-label="your sent letters">
          {messages.length === 0 && <p>you haven't written any letters yet and you're chopped</p>}

          {/* Show one card for each saved letter. */}
          {messages.map((letter) => (
            <article className="sent-letter" key={letter.id}>
              <div className="letter-heading">
                <h3>to: {recipientLabel(letter.to)}</h3>
                {letter.from === "Anonymous" && (
                  <span className="anonymous-label">anonymous</span>
                )}
              </div>
              <p className="letter-text">{letter.message}</p>
            </article>
          ))}
        </section>
      )}
      {/* Go back to the dashboard. */}
      <button
        type="button"
        onClick={onBack}
        className="button-secondary"
      >
        back to dashboard
      </button>
    </div>
  );
}
