"use client";

import { Home, LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuLinkItem,
  MenuSeparator,
  MenuTrigger,
} from "@/ui/primitives/menu";

export function AccountMenu({
  name,
  householdName,
}: {
  name: string;
  householdName: string;
}) {
  const router = useRouter();
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <Menu>
      <MenuTrigger
        aria-label="Account"
        className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-surface text-ui font-medium text-text outline-none transition-colors hover:bg-border/60 data-[popup-open]:bg-border/60"
      >
        {initial}
      </MenuTrigger>
      <MenuContent side="right" align="end">
        <MenuGroup>
          <MenuGroupLabel>
            {name} · {householdName}
          </MenuGroupLabel>
          <MenuLinkItem href="/me">
            <UserRound /> Me
          </MenuLinkItem>
          <MenuLinkItem href="/household">
            <Home /> Household
          </MenuLinkItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuItem
          onClick={async () => {
            await authClient.signOut();
            router.push("/sign-in");
            router.refresh();
          }}
        >
          <LogOut /> Sign out
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
