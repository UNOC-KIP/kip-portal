"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditUserDialog, type UserEditData } from "../users/[id]/edit-user-dialog";

/**
 * Opens the shared user/org edit dialog from the application page. Reuses the
 * exact editor (and the same admin-only PATCH /users/:id) that the user detail
 * page uses, so applicant + company edits behave identically wherever they start.
 */
export function EditApplicantButton({
  userId,
  initial,
}: {
  userId: string;
  initial: UserEditData;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil size={13} className="mr-1.5" /> Edit
      </Button>
      <EditUserDialog
        open={open}
        onClose={() => setOpen(false)}
        userId={userId}
        initial={initial}
      />
    </>
  );
}
