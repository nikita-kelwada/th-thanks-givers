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
  doc,
  runTransaction,
  writeBatch,
} from "firebase/firestore";

type SentMessage = {
  id: string;
  to: string;
  message: string;
  from: string;
  createdAt: number;
  senderId?: string;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isBusy = isSaving || isDeleting;
  const [saveError, setSaveError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  const saveLetter = async (event: React.FormEvent, letter: SentMessage) => {
    event.preventDefault();
    if (isBusy || !draft.trim() || draft.length > 10000) return;
    setIsSaving(true);
    setSaveError("");
    setSaveStatus("");

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Sign in to edit your letter.");
      const reference = doc(db, "messages", letter.id);
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(reference);
        const original = snapshot.data();
        if (!original || (original.senderId !== user.uid
          && !(original.senderId === undefined && original.from === currentUser))) {
          throw new Error("This letter cannot be edited by this account.");
        }
        transaction.update(reference, { message: draft });
        // Keep the admin view current without exposing the author's account ID.
        transaction.set(doc(db, "adminMessages", letter.id), {
          to: original.to,
          message: draft,
          from: original.from,
          createdAt: original.createdAt,
        });
      });
      setMessages((previous) => previous.map((message) =>
        message.id === letter.id ? { ...message, message: draft } : message,
      ));
      setEditingId(null);
      setSaveStatus("your letter has been updated!");
    } catch (error) {
      console.error("Couldn't save your letter:", error);
      setSaveError("Couldn't save your changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteLetter = async (letter: SentMessage) => {
    if (isBusy || !window.confirm(`Delete your letter to ${recipientLabel(letter.to)}? This can't be undone.`)) return;
    setIsDeleting(true);
    setSaveError("");
    setSaveStatus("");

    try {
      const user = auth.currentUser;
      if (!user || (letter.senderId !== user.uid
        && !(letter.senderId === undefined && letter.from === currentUser))) {
        throw new Error("This letter cannot be deleted by this account.");
      }
      const batch = writeBatch(db);
      batch.delete(doc(db, "messages", letter.id));
      batch.delete(doc(db, "adminMessages", letter.id));
      await batch.commit();
      setMessages((previous) => previous.filter((message) => message.id !== letter.id));
      setEditingId(null);
      setDraft("");
      setSaveStatus("your letter has been deleted");
    } catch (error) {
      console.error("Couldn't delete your letter:", error);
      setSaveError("Couldn't delete your letter. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

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
            senderId: data.senderId,
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
      <div role="status">{saveStatus}</div>

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
                  <span className="anonymous-label">from: anonymous</span>
                )}
                {editingId !== letter.id && (letter.senderId === auth.currentUser?.uid
                  || (letter.senderId === undefined && letter.from === currentUser)) && (
                  <button type="button" className="letter-edit-button" disabled={editingId !== null} onClick={() => {
                    setEditingId(letter.id);
                    setDraft(letter.message);
                    setSaveError("");
                    setSaveStatus("");
                  }}>edit</button>
                )}
              </div>
              {editingId === letter.id ? (
                <form className="thanks-form letter-edit-form" onSubmit={(event) => saveLetter(event, letter)}>
                  <label htmlFor={`edit-${letter.id}`}>edit your message:</label>
                  <textarea
                    id={`edit-${letter.id}`}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    maxLength={10000}
                    required
                    autoFocus
                    disabled={isBusy}
                  />
                  {saveError && <p role="alert">{saveError}</p>}
                  <div className="letter-edit-actions">
                    <button type="submit" className="button-primary" disabled={isBusy || !draft.trim()}>
                      {isSaving ? "saving..." : "save"}
                    </button>
                    <button type="button" className="button-secondary" disabled={isBusy} onClick={() => {
                      setEditingId(null);
                      setSaveError("");
                    }}>cancel</button>
                    <button type="button" className="letter-delete-button" disabled={isBusy} onClick={() => deleteLetter(letter)}>
                      {isDeleting ? "deleting..." : "delete"}
                    </button>
                  </div>
                </form>
              ) : (
                <p className="letter-text">{letter.message}</p>
              )}
            </article>
          ))}
        </section>
      )}
      {/* Go back to the dashboard. */}
      <button
        type="button"
        onClick={onBack}
        className="button-secondary"
        disabled={isBusy}
      >
        back to dashboard
      </button>
    </div>
  );
}
