import type { ReactNode } from "react";
import {
  GoogleTagManager,
  GoogleTagManagerNoScript,
} from "@/components/google-tag-manager";

/**
 * Public marketing pages — home, about, contact, and the static content pages.
 * Route groups don't affect URLs, so these still live at `/`, `/about`, etc.
 *
 * Analytics is mounted here rather than in the root layout so GTM never loads
 * on the investor dashboard, the auth pages, or `/launch` — signed-in
 * behaviour stays out of the analytics property.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <GoogleTagManagerNoScript />
      <GoogleTagManager />
      {children}
    </>
  );
}
