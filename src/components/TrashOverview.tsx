import { useEffect, useState } from 'react'
import { FileText, Folder, MoreHorizontal, RotateCcw, Trash2 } from 'lucide-react'

import { ActionFeedback } from '@/components/ActionFeedback'
import type { FeedbackVariant } from '@/components/ActionFeedback'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import type { EntityId, FileResponse, FolderResponse } from '@/lib/api'

type PendingDelete =
  | { kind: 'file'; id: number; name: string }
  | { kind: 'folder'; id: EntityId; name: string }

function formatDate(value?: string | null) {
  return value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleDateString() : '—'
}

export function TrashOverview({ onStorageChanged }: { onStorageChanged: () => Promise<void> }) {
  const [files, setFiles] = useState<FileResponse[]>([])
  const [folders, setFolders] = useState<FolderResponse[]>([])
  const [feedback, setFeedback] = useState<{ message: string; variant: FeedbackVariant } | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [deleteError, setDeleteError] = useState('')

  async function refresh() {
    const [trashedFiles, trashedFolders] = await Promise.all([
      api.listTrashedFiles(),
      api.listTrashedFolders(),
    ])
    setFiles(trashedFiles)
    setFolders(trashedFolders)
  }

  useEffect(() => {
    void refresh()
      .catch((error: unknown) => setFeedback({ message: error instanceof Error ? error.message : 'Could not load Trash.', variant: 'error' }))
      .finally(() => setLoading(false))
  }, [])

  async function perform(key: string, action: () => Promise<unknown>, success: string) {
    setBusyKey(key)
    setFeedback(null)
    try {
      await action()
      await refresh()
      setFeedback({ message: success, variant: 'success' })
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : 'That action could not be completed.', variant: 'error' })
    } finally {
      setBusyKey(null)
    }
  }

  async function confirmPermanentDelete() {
    if (!pendingDelete) return
    const { kind, id } = pendingDelete
    setBusyKey(`${kind}-${id}`)
    setDeleteError('')
    setFeedback(null)
    try {
      if (kind === 'file') await api.permanentlyDeleteFile(id)
      else await api.permanentlyDeleteFolder(id)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Could not permanently delete this item.')
      return
    } finally {
      setBusyKey(null)
    }

    setPendingDelete(null)
    setFeedback({ message: `${kind === 'file' ? 'File' : 'Folder'} permanently deleted.`, variant: 'success' })
    try { await refresh() }
    catch (error) { setFeedback({ message: error instanceof Error ? `Deleted, but Trash could not refresh: ${error.message}` : 'Deleted, but Trash could not refresh.', variant: 'error' }) }
    try { await onStorageChanged() }
    catch (error) { setFeedback({ message: error instanceof Error ? `Deleted, but storage information could not refresh: ${error.message}` : 'Deleted, but storage information could not refresh.', variant: 'error' }) }
  }

  return (
    <div className="flex flex-col gap-8">
      <Dialog
        onOpenChange={(open) => {
          if (!open && !busyKey) { setPendingDelete(null); setDeleteError('') }
        }}
        open={pendingDelete !== null}
      >
        <DialogContent>
          <DialogHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 aria-hidden="true" className="size-5" />
            </div>
            <DialogTitle>Delete permanently?</DialogTitle>
            <DialogDescription>
              This will permanently remove <span className="font-medium text-foreground">{pendingDelete?.name}</span>. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && <ActionFeedback message={deleteError} variant="error" />}
          <DialogFooter>
            <Button disabled={busyKey !== null} onClick={() => setPendingDelete(null)} type="button" variant="outline">Cancel</Button>
            <Button disabled={busyKey !== null} onClick={() => void confirmPermanentDelete()} type="button" variant="destructive">
              {busyKey ? 'Deleting…' : 'Delete permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {feedback && <ActionFeedback message={feedback.message} onDismiss={() => setFeedback(null)} variant={feedback.variant} />}

      <section aria-labelledby="trash-folders-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" id="trash-folders-heading">Deleted folders</h2>
          <span className="text-xs text-muted-foreground">{folders.length}</span>
        </div>
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Name</TableHead>
                <TableHead className="hidden sm:table-cell">Last updated</TableHead>
                <TableHead className="w-12 pr-3"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {folders.map((folder) => (
                <TableRow key={folder.id}>
                  <TableCell className="py-3 pl-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-sky-100 text-sky-700"><Folder aria-hidden="true" className="size-4" /></div>
                      <span className="font-medium">{folder.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{formatDate(folder.updatedAt)}</TableCell>
                  <TableCell className="pr-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger aria-label={`Actions for ${folder.name}`} render={<Button disabled={busyKey === `folder-${folder.id}`} size="icon" variant="ghost" />}><MoreHorizontal /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => void perform(`folder-${folder.id}`, () => api.restoreFolder(folder.id), 'Folder restored.')}><RotateCcw />Restore</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { setDeleteError(''); setPendingDelete({ kind: 'folder', id: folder.id, name: folder.name }) }} variant="destructive"><Trash2 />Delete permanently</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && folders.length === 0 && <TableRow><TableCell className="py-7 text-center text-sm text-muted-foreground" colSpan={3}>No deleted folders.</TableCell></TableRow>}
              {loading && <TableRow><TableCell className="py-7 text-center text-sm text-muted-foreground" colSpan={3}>Loading folders…</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </section>

      <section aria-labelledby="trash-files-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" id="trash-files-heading">Deleted files</h2>
          <span className="text-xs text-muted-foreground">{files.length}</span>
        </div>
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Name</TableHead>
                <TableHead className="hidden sm:table-cell">Last updated</TableHead>
                <TableHead className="w-12 pr-3"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell className="py-3 pl-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><FileText aria-hidden="true" className="size-4" /></div>
                      <div className="min-w-0"><p className="truncate font-medium">{file.filename}</p><p className="text-xs text-muted-foreground">File</p></div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{formatDate(file.updatedAt)}</TableCell>
                  <TableCell className="pr-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger aria-label={`Actions for ${file.filename}`} render={<Button disabled={busyKey === `file-${file.id}`} size="icon" variant="ghost" />}><MoreHorizontal /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => void perform(`file-${file.id}`, () => api.restoreFile(file.id), 'File restored.')}><RotateCcw />Restore</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { setDeleteError(''); setPendingDelete({ kind: 'file', id: file.id, name: file.filename }) }} variant="destructive"><Trash2 />Delete permanently</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && files.length === 0 && <TableRow><TableCell className="py-7 text-center text-sm text-muted-foreground" colSpan={3}>No deleted files.</TableCell></TableRow>}
              {loading && <TableRow><TableCell className="py-7 text-center text-sm text-muted-foreground" colSpan={3}>Loading files…</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
