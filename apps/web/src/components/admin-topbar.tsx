"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminTopbar() {
  return (
    <header className="sticky top-0 z-30 flex shrink-0 items-center justify-end border-b border-ink-200 bg-white px-6 py-2.5">
      <Button variant="outline" size="icon" className="h-9 w-9">
        <Bell size={16} />
      </Button>
    </header>
  );
}
