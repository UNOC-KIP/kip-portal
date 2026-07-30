import type { ReactNode } from "react";

/**
 * Public marketing pages — home, about, contact, and the static content pages.
 * Route groups don't affect URLs, so these still live at `/`, `/about`, etc.
 *
 * Analytics is NOT mounted here — GTM lives in the root layout so it covers the
 * whole portal (public pages, dashboard, auth, `/launch`). Mounting it here too
 * would load the container twice on every marketing page.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
