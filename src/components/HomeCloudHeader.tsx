import { ChevronDown } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

export function HomeCloudHeader({
  pageTitle,
  onNavigateHome,
  onSignOut,
  username,
}: {
  pageTitle: string
  onNavigateHome: () => void
  onSignOut: () => void
  username: string
}) {
  return (
    <header className="flex min-h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <SidebarTrigger aria-label="Toggle sidebar" />
      <Separator orientation="vertical" className="h-5" />

      <Breadcrumb className="hidden sm:block">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              href="#home"
              onClick={(event) => {
                event.preventDefault()
                onNavigateHome()
              }}
            >
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex min-w-0 items-center gap-2 md:gap-3">

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Open account menu"
            render={<Button className="h-auto gap-2 px-2 py-1.5" variant="ghost" />}
          >
            <Avatar size="sm">
              <AvatarFallback className="bg-primary/10 font-medium text-primary">{username.slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:inline">{username}</span>
            <ChevronDown aria-hidden="true" className="hidden size-4 text-muted-foreground sm:block" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{username}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
