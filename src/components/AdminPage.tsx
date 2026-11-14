// onBack runs when the back button is clicked.
type AdminPageProps = {
  onBack: () => void;
};

//export lets another file use that func
export function AdminPage({ onBack }: AdminPageProps) {
  return (
    <div className="dashboard-page">
      <h2>Admin Mode</h2>

      {/* Return to the dashboard. */}
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
