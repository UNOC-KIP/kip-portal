import Link from "next/link";
import type { ReactNode } from "react";

interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  crumbs: Crumb[];
  action?: ReactNode;
  className?: string;
}

export function PageHeader({ crumbs, action, className }: PageHeaderProps) {
  return (
    <div className={`mb-6 flex items-center justify-between ${className ?? ""}`}>
      <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span key={crumb.label} className="flex items-center gap-1">
              {i > 0 && <span className="text-ink-300">/</span>}
              {isLast ? (
                <span className="font-semibold text-ink-900">{crumb.label}</span>
              ) : crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-ink-500 transition hover:text-ink-900"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-ink-500">{crumb.label}</span>
              )}
            </span>
          );
        })}
      </nav>
      {action && <div>{action}</div>}
    </div>
  );
}
