"use client";

import { deleteCustomerAction, setCustomerStatusAction } from "@/app/(app)/customers/actions";
import { Button } from "@/components/ui/button";
import { useActionRunner } from "@/hooks/use-action-runner";
import type { CustomerStatus } from "@/lib/db/schema";

export function CustomerDetailActions({
  customerId,
  status,
}: {
  customerId: string;
  status: CustomerStatus;
}) {
  const { pending, run } = useActionRunner();

  return (
    <div className="flex gap-2">
      {status === "active" ? (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => run(() => setCustomerStatusAction(customerId, "archived"))}
        >
          Archive
        </Button>
      ) : (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => run(() => setCustomerStatusAction(customerId, "active"))}
        >
          Restore
        </Button>
      )}
      <Button
        variant="destructive"
        disabled={pending}
        onClick={() =>
          run(() => deleteCustomerAction(customerId), {
            confirm: "Permanently delete this customer? This cannot be undone.",
          })
        }
      >
        Delete
      </Button>
    </div>
  );
}
