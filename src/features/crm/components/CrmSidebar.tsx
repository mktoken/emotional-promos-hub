import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Megaphone, FileText, UserCog, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useCrmAuth } from "@/features/crm/hooks/useCrmAuth";

const STAFF_ROLES = new Set(["admin", "sales_manager", "sales_agent"]);

const items = [
  { title: "Dashboard", url: "/crm", icon: LayoutDashboard, exact: true },
  { title: "Cotizaciones", url: "/crm/cotizaciones", icon: FileText, exact: false },
  { title: "Prospectos", url: "/crm/prospectos", icon: Users, exact: false },
  { title: "Campañas", url: "/crm/campanas", icon: Megaphone, exact: false },
];

export function CrmSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const auth = useCrmAuth();
  const isStaff = auth.roles.some((r) => STAFF_ROLES.has(r));
  const isAdmin = auth.roles.includes("admin");

  const isActive = (url: string, exact: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  const accountItems = [
    ...(isStaff ? [{ title: "Mi perfil", url: "/crm/mi-perfil", icon: UserCog, exact: false }] : []),
    ...(isAdmin ? [{ title: "Configuración", url: "/crm/configuracion", icon: Settings, exact: false }] : []),
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>CRM</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url, item.exact)}>
                    <NavLink to={item.url} end={item.exact} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {accountItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Cuenta</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {accountItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url, item.exact)}>
                      <NavLink to={item.url} end={item.exact} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

