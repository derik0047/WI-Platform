"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { toast } from "sonner";

import { setActiveOrganizationAction } from "@/app/(app)/organizations/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type OrganizationOption = { id: string; name: string; slug: string };

export function OrganizationSwitcher({
  organizations,
  activeId,
}: {
  organizations: OrganizationOption[];
  activeId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const active = organizations.find((org) => org.id === activeId) ?? null;

  function switchTo(id: string) {
    if (id === activeId) return;
    startTransition(async () => {
      const result = await setActiveOrganizationAction(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending} className="min-w-40 justify-between">
          <span className="truncate">{active?.name ?? "Select organization"}</span>
          <ChevronsUpDown className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        {organizations.length === 0 ? (
          <DropdownMenuItem disabled>No organizations yet</DropdownMenuItem>
        ) : (
          organizations.map((org) => (
            <DropdownMenuItem key={org.id} onSelect={() => switchTo(org.id)}>
              <Check className={cn(org.id === activeId ? "opacity-100" : "opacity-0")} />
              <span className="truncate">{org.name}</span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/organizations/new">
            <Plus />
            Create organization
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
