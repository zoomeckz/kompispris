import { ComponentType, lazy } from "react";

const RELOADED = "kompispris.reloaded";

/** React.lazy that survives a new release: a tab opened before the release asks for page files that no longer
 *  exist, so the first failure reloads the app once (which picks up the new version) instead of showing an error. */
export function lazyPage<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(() => load().then(
    (m) => { try { sessionStorage.removeItem(RELOADED); } catch { /* ignore */ } return m; },
    (e) => {
      let again = false;
      try { again = !sessionStorage.getItem(RELOADED); if (again) sessionStorage.setItem(RELOADED, "1"); } catch { /* ignore */ }
      if (again) { window.location.reload(); return new Promise<{ default: T }>(() => {}); }
      throw e;
    },
  ));
}
