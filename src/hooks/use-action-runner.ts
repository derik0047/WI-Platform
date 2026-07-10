"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { type ActionResult } from "@/lib/action-result";

/**
 * Runs a Server Action from a client component with the shared UX contract:
 * optional confirm, pending state, error/success toasts, and a router refresh on
 * success. Actions that redirect simply never reach the success branch.
 */
export function useActionRunner() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(
    action: () => Promise<ActionResult>,
    options?: { confirm?: string; successMessage?: string; onError?: () => void },
  ) {
    if (options?.confirm && !window.confirm(options.confirm)) return;
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        options?.onError?.(); // e.g. roll back an optimistic update
        return;
      }
      toast.success(options?.successMessage ?? result.message ?? "Done");
      router.refresh();
    });
  }

  return { pending, run };
}
