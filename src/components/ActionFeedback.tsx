import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

import { Button } from '@/components/ui/button'

export type FeedbackVariant = 'error' | 'success' | 'info'

export function ActionFeedback({
  message,
  variant = 'error',
  title,
  onDismiss,
  compact = false,
}: {
  message: string
  variant?: FeedbackVariant
  title?: string
  onDismiss?: () => void
  compact?: boolean
}) {
  const Icon = variant === 'error' ? AlertCircle : variant === 'success' ? CheckCircle2 : Info
  const heading = title ?? (variant === 'error' ? 'Couldn’t complete the action' : variant === 'success' ? 'Action completed' : 'Notice')
  const colors = variant === 'error'
    ? 'border-destructive/25 bg-destructive/5 text-destructive'
    : variant === 'success'
      ? 'border-emerald-600/20 bg-emerald-600/5 text-emerald-700 dark:text-emerald-400'
      : 'border-border bg-muted/50 text-foreground'

  return (
    <div aria-live="polite" className={`flex items-start gap-3 rounded-xl border ${compact ? 'p-2.5' : 'p-3.5'} ${colors}`} role={variant === 'error' ? 'alert' : 'status'}>
      <Icon aria-hidden="true" className={`${compact ? 'mt-0.5 size-4' : 'mt-0.5 size-5'} shrink-0`} />
      <div className="min-w-0 flex-1">
        <p className={`${compact ? 'text-xs' : 'text-sm'} font-semibold`}>{heading}</p>
        <p className={`${compact ? 'mt-0.5 text-[11px]' : 'mt-1 text-sm'} break-words text-foreground/80`}>{message}</p>
      </div>
      {onDismiss && <Button aria-label="Dismiss message" className="-mr-2 -mt-2 shrink-0" onClick={onDismiss} size="icon-sm" variant="ghost"><X aria-hidden="true" /></Button>}
    </div>
  )
}
