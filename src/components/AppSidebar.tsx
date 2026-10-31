import {
  Cloud,
  FolderOpen,
  HardDrive,
  Plus,
  Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { ActionFeedback } from '@/components/ActionFeedback'
import { Button } from '@/components/ui/button'
import type { StorageResponse } from '@/lib/api'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'

export type MainView =
  | 'files'
  | 'trash'

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let size = bytes / 1024
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit += 1 }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unit]}`
}

const workspaceItems: {
  title: string
  icon: LucideIcon
  view: MainView
}[] = [
  { title: 'My Files', icon: FolderOpen, view: 'files' },
  { title: 'Trash', icon: Trash2, view: 'trash' },
]

export function AppSidebar({
  activeView,
  onNavigate,
  storage,
  storageError,
}: {
  activeView: MainView
  onNavigate: (view: MainView) => void
  storage: StorageResponse | null
  storageError: string
}) {
  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="gap-3 p-4">
        <div className="flex items-center gap-3 px-1">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Cloud aria-hidden="true" className="size-5" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold tracking-tight">HomeCloud</p>
            <p className="text-xs text-muted-foreground">Personal cloud</p>
          </div>
        </div>
        <Button className="w-full justify-start group-data-[collapsible=icon]:hidden" onClick={() => onNavigate('files')} size="sm">
          <Plus aria-hidden="true" />
          New
        </Button>
      </SidebarHeader>

      <SidebarSeparator className="mx-0 w-auto" />

      <SidebarContent className="px-2 py-3">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarMenu>
            {workspaceItems.map(({ title, icon: Icon, view }) => (
              <SidebarMenuItem key={title}>
                <SidebarMenuButton
                  isActive={activeView === view}
                  render={<button type="button" onClick={() => onNavigate(view)} />}
                  tooltip={title}
                >
                  <Icon aria-hidden="true" />
                  <span>{title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 group-data-[collapsible=icon]:hidden">
        <div aria-label="Storage usage" className="rounded-xl border bg-card p-3">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HardDrive aria-hidden="true" className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium">Storage</p>
              {storage ? <p className="truncate text-sm font-semibold">{formatBytes(storage.availableBytes)} left</p> : !storageError && <p className="truncate text-xs text-muted-foreground">Loading storage…</p>}
            </div>
          </div>
          {!storage && storageError && <ActionFeedback compact message={storageError} title="Storage unavailable" variant="error" />}
          {storage && <>
            <div aria-label={`${Math.round(storage.usedPercentage)}% used`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={Math.min(100, Math.max(0, storage.usedPercentage))} className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar">
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.min(100, Math.max(0, storage.usedPercentage))}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{formatBytes(storage.usedBytes)} of {formatBytes(storage.limitBytes)} used</p>
          </>}
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
