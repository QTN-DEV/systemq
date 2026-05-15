import {
  Activity,
  type LucideIcon,
  FileText,
  LayoutDashboard,
  Building2,
  Network,
  Users,
  Folder,
  Kanban,
  Settings2,
  CircleHelp,
  Inbox,
  CheckSquare,
  MessageSquare,
  FolderOpen,
  ChevronRight,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import {
  matchPath,
  NavLink,
  useLocation,
  type Location,
} from "react-router-dom";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export interface AppSidebarMenuItem {
  id: string;
  title: string;
  path?: string;
  icon: string;
  type?: string;
  roles?: string[];
  children?: Array<{
    id: string;
    title: string;
    path: string;
    roles?: string[];
  }>;
}

const navTitleClassName = "min-w-0 flex-1 truncate";

const menuButtonClassName = cn(
  "text-foreground",
  "hover:!bg-primary/10 hover:!text-primary",
  "data-[active=true]:!bg-primary/10 data-[active=true]:!text-primary data-[active=true]:hover:!bg-primary/15",
  "[&>svg]:text-muted-foreground",
  "hover:[&>svg]:text-primary",
  "data-[active=true]:[&>svg]:text-primary",
);

/** Collapsible parent: only route-active should highlight, not expand/collapse state */
const collapsibleTriggerClassName = cn(
  menuButtonClassName,
  "data-[state=open]:data-[active=false]:!bg-transparent data-[state=open]:data-[active=false]:!text-foreground",
  "data-[state=open]:data-[active=false]:hover:!bg-primary/10 data-[state=open]:data-[active=false]:hover:!text-primary",
  "data-[state=open]:data-[active=false]:[&>svg]:text-muted-foreground",
);

const menuSubButtonClassName = cn(
  "text-muted-foreground",
  "hover:!bg-primary/10 hover:!text-primary hover:[&>svg]:text-primary",
  "data-[active=true]:!bg-primary/10 data-[active=true]:!text-primary data-[active=true]:hover:!bg-primary/15",
  "[&_a]:flex [&_a]:min-w-0 [&_a]:overflow-hidden",
  "[&_a>span]:min-w-0 [&_a>span]:flex-1 [&_a>span]:truncate",
);

const iconMap: Record<string, LucideIcon> = {
  Activity,
  FileText,
  LayoutDashboard,
  Building2,
  Network,
  Users,
  Folder,
  Kanban,
  Settings2,
  Inbox,
  CheckSquare,
  MessageSquare,
  FolderOpen,
};

function useRouteActive(
  path: string,
  options?: {
    end?: boolean;
    isActive?: (args: { isActive: boolean; location: Location }) => boolean;
  },
): boolean {
  const location = useLocation();
  const matched =
    matchPath({ path, end: options?.end ?? false }, location.pathname) !== null;
  if (options?.isActive) {
    return options.isActive({ isActive: matched, location });
  }
  return matched;
}

function useCollapsibleOpen(
  isRouteActive: boolean,
): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(isRouteActive);

  useEffect(() => {
    if (isRouteActive) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [isRouteActive]);

  return [open, setOpen];
}

interface AppSidebarNavProps {
  items: AppSidebarMenuItem[];
  isSystemAdmin: boolean;
}

export function AppSidebarNav({
  items,
  isSystemAdmin,
}: AppSidebarNavProps): ReactElement {
  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => {
              const Icon = iconMap[item.icon] ?? CircleHelp;

              if (item.id === "documents") {
                return (
                  <DocumentsNavItem
                    key={item.id}
                    icon={Icon}
                    label={item.title}
                    isSystemAdmin={isSystemAdmin}
                  />
                );
              }

              if (item.type === "collapsible" && item.children) {
                return (
                  <CollapsibleNavItem
                    key={item.id}
                    icon={Icon}
                    label={item.title}
                  >
                    {item.children}
                  </CollapsibleNavItem>
                );
              }

              if (!item.path) return null;

              return (
                <SidebarNavMenuItem
                  key={item.id}
                  to={item.path}
                  tooltip={item.title}
                  icon={Icon}
                  label={item.title}
                />
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}

function SidebarNavMenuItem({
  to,
  end,
  isActive: isActiveOption,
  tooltip,
  icon: Icon,
  label,
}: {
  to: string;
  end?: boolean;
  isActive?: (args: { isActive: boolean; location: Location }) => boolean;
  tooltip: string;
  icon: LucideIcon;
  label: string;
}): ReactElement {
  const isActive = useRouteActive(to, { end, isActive: isActiveOption });

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={tooltip}
        className={menuButtonClassName}
      >
        <NavLink
          to={to}
          end={end}
          className="flex min-w-0 items-center gap-2 overflow-hidden"
        >
          <Icon className="shrink-0" />
          <span className={navTitleClassName}>{label}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function DocumentsNavItem({
  icon: Icon,
  label,
  isSystemAdmin,
}: {
  icon: LucideIcon;
  label: string;
  isSystemAdmin: boolean;
}): ReactElement {
  const { state } = useSidebar();
  const docsActive = useRouteActive("/documents/*");
  const [open, setOpen] = useCollapsibleOpen(docsActive);

  if (state === "collapsed") {
    return (
      <SidebarNavMenuItem
        to="/documents"
        tooltip={label}
        icon={Icon}
        label={label}
      />
    );
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={label}
            isActive={docsActive}
            className={collapsibleTriggerClassName}
          >
            <Icon className="shrink-0" />
            <span className={navTitleClassName}>{label}</span>
            <ChevronRight className="ml-auto shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            <SidebarMenuSubItem>
              <SidebarNavSubMenuItem
                to="/documents"
                isActive={({ isActive, location }) =>
                  isActive &&
                  !location.pathname.startsWith("/documents/shared") &&
                  !(
                    location.pathname.startsWith("/documents/file/") &&
                    new URLSearchParams(location.search).get("view") ===
                      "shared"
                  )
                }
                label="My Documents"
              />
            </SidebarMenuSubItem>
            {!isSystemAdmin && (
              <SidebarMenuSubItem>
                <SidebarNavSubMenuItem
                  to="/documents/shared"
                  isActive={({ location }) => {
                    if (location.pathname.startsWith("/documents/shared")) {
                      return true;
                    }
                    return (
                      location.pathname.startsWith("/documents/file/") &&
                      new URLSearchParams(location.search).get("view") ===
                        "shared"
                    );
                  }}
                  label="Shared with Me"
                />
              </SidebarMenuSubItem>
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

function SidebarNavSubMenuItem({
  to,
  end,
  isActive: isActiveOption,
  label,
}: {
  to: string;
  end?: boolean;
  isActive?: (args: { isActive: boolean; location: Location }) => boolean;
  label: string;
}): ReactElement {
  const isActive = useRouteActive(to, { end, isActive: isActiveOption });

  return (
    <SidebarMenuSubButton
      asChild
      isActive={isActive}
      className={menuSubButtonClassName}
    >
      <NavLink to={to} end={end}>
        <span className={navTitleClassName}>{label}</span>
      </NavLink>
    </SidebarMenuSubButton>
  );
}

function CollapsibleNavItem({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: Array<{ id: string; title: string; path: string }>;
}): ReactElement {
  const { state } = useSidebar();
  const location = useLocation();
  const isActive = useMemo(
    () =>
      children.some(
        (child) =>
          matchPath({ path: child.path, end: false }, location.pathname) !==
          null,
      ),
    [children, location.pathname],
  );
  const [open, setOpen] = useCollapsibleOpen(isActive);
  const firstChildPath = children[0]?.path ?? "#";

  if (state === "collapsed") {
    return (
      <SidebarNavMenuItem
        to={firstChildPath}
        tooltip={label}
        icon={Icon}
        label={label}
      />
    );
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={label}
            isActive={isActive}
            className={collapsibleTriggerClassName}
          >
            <Icon className="shrink-0" />
            <span className={navTitleClassName}>{label}</span>
            <ChevronRight className="ml-auto shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {children.map((child) => (
              <SidebarMenuSubItem key={child.id}>
                <SidebarNavSubMenuItem to={child.path} label={child.title} />
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
