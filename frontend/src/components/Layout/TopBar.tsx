import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "System overview & metrics" },
  "/repos": { title: "Repositories", subtitle: "GitHub repository registry" },
  "/deployment": {
    title: "Deployment",
    subtitle: "Orchestrate remote deployments",
  },
  "/configuration": {
    title: "Configuration",
    subtitle: "Environments & server management",
  },
  "/users": {
    title: "User Management",
    subtitle: "Manage system administrators and developer access",
  },
};

export default function TopBar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const page = PAGE_TITLES[location.pathname] || { title: "CCD", subtitle: "" };

  return (
    <header className="h-16 shrink-0 bg-ccd-surface border-b border-ccd-border px-6 flex items-center justify-between">
      <div>
        <h1 className="text-base font-semibold text-ccd-text">{page.title}</h1>
        <p className="text-xs text-ccd-text-muted">{page.subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Status indicator */}
        <div className="flex items-center gap-2 text-xs text-ccd-text-muted"></div>

        {/* User menu */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-ccd-text">
                {user.name || user.login}
              </div>
              <div className="text-xs text-ccd-text-muted">@{user.login}</div>
            </div>
            <img
              src={user.avatar_url || `https://github.com/${user.login}.png`}
              alt={user.login}
              className="w-8 h-8 rounded-full border border-ccd-border"
            />
            <button
              onClick={logout}
              title="Logout"
              className="ccd-btn-ghost p-2 rounded-lg"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="w-4 h-4"
              >
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
