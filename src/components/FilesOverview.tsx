import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Archive, FileImage, FileText, Folder, MoreHorizontal, Plus, Upload } from 'lucide-react'

import { ActionFeedback } from '@/components/ActionFeedback'
import type { FeedbackVariant } from '@/components/ActionFeedback'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import type { EntityId, FileResponse, FolderResponse } from '@/lib/api'

type RenameTarget = { kind: 'folder'; item: FolderResponse } | { kind: 'file'; item: FileResponse }
type MoveTarget = { kind: 'folder'; item: FolderResponse } | { kind: 'file'; item: FileResponse }
type MoveOption = { key: string; name: string; id: EntityId | null }

function formatSize(bytes?: number | null) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let size = bytes / 1024
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit += 1 }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unit]}`
}

function fileType(file: FileResponse) {
  const extension = file.filename.split('.').pop()?.toLowerCase()
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension ?? '')) return 'Image'
  if (['zip', '7z', 'rar', 'tar', 'gz'].includes(extension ?? '')) return 'Archive'
  if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(extension ?? '')) return 'Document'
  return 'File'
}

function FileIcon({ file }: { file: FileResponse }) {
  const type = fileType(file).toLowerCase()
  const Icon = type.startsWith('image/') || type === 'image' ? FileImage : type.includes('zip') || type === 'archive' ? Archive : FileText
  return <Icon aria-hidden="true" className="size-4" />
}

export function FilesOverview({ onStorageChanged }: { onStorageChanged: () => Promise<void> }) {
  const [folderId, setFolderId] = useState<EntityId | null>(null)
  const [path, setPath] = useState<FolderResponse[]>([])
  const [folders, setFolders] = useState<FolderResponse[]>([])
  const [files, setFiles] = useState<FileResponse[]>([])
  const [feedback, setFeedback] = useState<{ message: string; variant: FeedbackVariant } | null>(null)
  const [busy, setBusy] = useState(false)
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [createFolderError, setCreateFolderError] = useState('')
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState('')
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null)
  const [moveDestination, setMoveDestination] = useState('root')
  const [moveError, setMoveError] = useState('')
  const uploadInput = useRef<HTMLInputElement>(null)

  const moveCandidates = moveTarget?.kind === 'folder'
    ? folders.filter((folder) => folder.id !== moveTarget.item.id)
    : folders
  const moveOptions: MoveOption[] = [
    { key: 'root', name: 'My Files', id: null },
    ...moveCandidates.map((folder, index) => ({ key: `folder-${index}`, name: folder.name, id: folder.id })),
  ]
  const moveTargetName = moveTarget
    ? moveTarget.kind === 'folder' ? moveTarget.item.name : moveTarget.item.filename
    : 'item'

  async function refresh() {
    const [nextFolders, nextFiles] = await Promise.all([api.listFolders(folderId), api.listFiles(folderId)])
    setFolders(nextFolders)
    setFiles(nextFiles)
  }

  useEffect(() => {
    void refresh().catch((error: unknown) => setFeedback({ message: error instanceof Error ? error.message : 'Could not load this folder.', variant: 'error' }))
  }, [folderId])

  async function perform(action: () => Promise<unknown>, success: string) {
    setBusy(true)
    setFeedback(null)
    try { await action(); await refresh(); setFeedback({ message: success, variant: 'success' }) }
    catch (error) { setFeedback({ message: error instanceof Error ? error.message : 'That action could not be completed.', variant: 'error' }) }
    finally { setBusy(false) }
  }

  async function createFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = newFolderName.trim()
    if (!name) return
    setBusy(true)
    setCreateFolderError('')
    setFeedback(null)
    try {
      await api.createFolder({ name, parentFolderId: folderId })
      await refresh()
      setFeedback({ message: 'Folder created.', variant: 'success' })
      setNewFolderName('')
      setCreateFolderOpen(false)
    } catch (error) {
      setCreateFolderError(error instanceof Error ? error.message : 'Could not create the folder.')
    } finally {
      setBusy(false)
    }
  }

  async function renameFolder(folder: FolderResponse) {
    setRenameError('')
    setRenameValue(folder.name)
    setRenameTarget({ kind: 'folder', item: folder })
  }

  async function moveFolder(folder: FolderResponse) {
    setMoveError('')
    setMoveDestination('root')
    setMoveTarget({ kind: 'folder', item: folder })
  }

  async function renameFile(file: FileResponse) {
    setRenameError('')
    setRenameValue(file.filename)
    setRenameTarget({ kind: 'file', item: file })
  }

  async function moveFile(file: FileResponse) {
    setMoveError('')
    setMoveDestination('root')
    setMoveTarget({ kind: 'file', item: file })
  }

  async function submitRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!renameTarget) return
    const name = renameValue.trim()
    if (!name) return
    setBusy(true)
    setRenameError('')
    try {
      if (renameTarget.kind === 'folder') await api.renameFolder(renameTarget.item.id, name)
      else await api.renameFile(renameTarget.item.id, name)
      await refresh()
      setRenameTarget(null)
      setFeedback({ message: `${renameTarget.kind === 'folder' ? 'Folder' : 'File'} renamed.`, variant: 'success' })
    } catch (error) {
      setRenameError(error instanceof Error ? error.message : 'Could not rename this item.')
    } finally { setBusy(false) }
  }

  async function submitMove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!moveTarget) return
    const destination = moveOptions.find((option) => option.key === moveDestination)
    if (!destination) return
    setBusy(true)
    setMoveError('')
    try {
      if (moveTarget.kind === 'folder') await api.moveFolder(moveTarget.item.id, destination.id)
      else await api.moveFile(moveTarget.item.id, destination.id)
      await refresh()
      setMoveTarget(null)
      setFeedback({ message: `${moveTarget.kind === 'folder' ? 'Folder' : 'File'} moved.`, variant: 'success' })
    } catch (error) {
      setMoveError(error instanceof Error ? error.message : 'Could not move this item.')
    } finally { setBusy(false) }
  }

  async function upload(filesToUpload: FileList | null) {
    if (!filesToUpload?.length) return
    setBusy(true); setFeedback(null)
    try {
      for (const file of Array.from(filesToUpload)) await api.uploadFile(file, folderId)
      await refresh()
      await onStorageChanged()
      setFeedback({ message: `${filesToUpload.length} file${filesToUpload.length === 1 ? '' : 's'} uploaded.`, variant: 'success' })
    } catch (error) { setFeedback({ message: error instanceof Error ? error.message : 'Upload failed.', variant: 'error' }) }
    finally { setBusy(false); if (uploadInput.current) uploadInput.current.value = '' }
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Folder path" className="flex items-center gap-2 text-sm">
          <button className={path.length ? 'text-muted-foreground hover:text-foreground' : 'font-medium'} onClick={() => { setFolderId(null); setPath([]) }} type="button">My Files</button>
          {path.map((folder, index) => <span className="flex items-center gap-2" key={folder.id}><span className="text-muted-foreground">/</span><button className={index === path.length - 1 ? 'font-medium' : 'text-muted-foreground hover:text-foreground'} onClick={() => { setPath(path.slice(0, index + 1)); setFolderId(folder.id) }} type="button">{folder.name}</button></span>)}
        </nav>
        <div className="flex gap-2">
          <input className="hidden" multiple onChange={(event) => void upload(event.target.files)} ref={uploadInput} type="file" />
          <Button disabled={busy} onClick={() => uploadInput.current?.click()} variant="outline"><Upload />Upload files</Button>
          <Button disabled={busy} onClick={() => { setCreateFolderError(''); setCreateFolderOpen(true) }}><Plus />New folder</Button>
        </div>
      </div>

      <Dialog onOpenChange={(open) => {
        setCreateFolderOpen(open)
        if (!open) { setCreateFolderError(''); setNewFolderName('') }
      }} open={createFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new folder</DialogTitle>
            <DialogDescription>Choose a name for the folder in {path.at(-1)?.name ?? 'My Files'}.</DialogDescription>
          </DialogHeader>
          <form className="space-y-5" onSubmit={createFolder}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="new-folder-name">Folder name</label>
              <Input
                autoFocus
                autoComplete="off"
                id="new-folder-name"
                maxLength={255}
                onChange={(event) => setNewFolderName(event.target.value)}
                placeholder="e.g. Project files"
                value={newFolderName}
              />
            </div>
            {createFolderError && <ActionFeedback message={createFolderError} variant="error" />}
            <DialogFooter>
              <Button disabled={busy} onClick={() => setCreateFolderOpen(false)} type="button" variant="outline">Cancel</Button>
              <Button disabled={busy || !newFolderName.trim()} type="submit">
                {busy ? 'Creating…' : 'Create folder'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={(open) => { if (!open && !busy) { setRenameTarget(null); setRenameError('') } }} open={renameTarget !== null}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {renameTarget?.kind ?? 'item'}</DialogTitle>
            <DialogDescription>Enter a new name for this {renameTarget?.kind ?? 'item'}.</DialogDescription>
          </DialogHeader>
          <form className="space-y-5" onSubmit={submitRename}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="rename-item">Name</label>
              <Input autoFocus autoComplete="off" id="rename-item" maxLength={255} onChange={(event) => setRenameValue(event.target.value)} required value={renameValue} />
            </div>
            {renameError && <ActionFeedback message={renameError} variant="error" />}
            <DialogFooter>
              <Button disabled={busy} onClick={() => setRenameTarget(null)} type="button" variant="outline">Cancel</Button>
              <Button disabled={busy || !renameValue.trim()} type="submit">{busy ? 'Saving…' : 'Save name'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={(open) => { if (!open && !busy) { setMoveTarget(null); setMoveError('') } }} open={moveTarget !== null}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move {moveTarget?.kind ?? 'item'}</DialogTitle>
            <DialogDescription>Choose a destination for “{moveTargetName}”.</DialogDescription>
          </DialogHeader>
          <form className="space-y-5" onSubmit={submitMove}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="move-destination">Destination</label>
              <select
                className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                id="move-destination"
                onChange={(event) => setMoveDestination(event.target.value)}
                value={moveDestination}
              >
                {moveOptions.map((option) => <option key={option.key} value={option.key}>{option.name}</option>)}
              </select>
            </div>
            {moveError && <ActionFeedback message={moveError} variant="error" />}
            <DialogFooter>
              <Button disabled={busy} onClick={() => setMoveTarget(null)} type="button" variant="outline">Cancel</Button>
              <Button disabled={busy} type="submit">{busy ? 'Moving…' : 'Move'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {feedback && <ActionFeedback message={feedback.message} onDismiss={() => setFeedback(null)} variant={feedback.variant} />}

      <section aria-labelledby="folders-heading" className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-sm font-semibold" id="folders-heading">Folders</h2><span className="text-xs text-muted-foreground">{folders.length} folders</span></div>
        {folders.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {folders.map((folder) => <Card className="group transition-colors hover:bg-muted/30" key={folder.id} size="sm">
            <CardContent className="flex items-center gap-3">
              <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => { setPath([...path, folder]); setFolderId(folder.id) }} type="button">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700"><Folder aria-hidden="true" className="size-5" /></div>
                <span className="min-w-0"><span className="block truncate font-medium">{folder.name}</span><span className="mt-1 block text-xs text-muted-foreground">Folder</span></span>
              </button>
              <DropdownMenu><DropdownMenuTrigger aria-label={`Actions for ${folder.name}`} render={<Button size="icon" variant="ghost" />}><MoreHorizontal /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => void renameFolder(folder)}>Rename</DropdownMenuItem><DropdownMenuItem onClick={() => void moveFolder(folder)}>Move</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => void perform(() => api.trashFolder(folder.id), 'Folder moved to Trash.')} variant="destructive">Move to Trash</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
            </CardContent>
          </Card>)}
        </div> : <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">No folders here yet.</p>}
      </section>

      <section aria-labelledby="files-heading" className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-sm font-semibold" id="files-heading">Files</h2><span className="text-xs text-muted-foreground">{files.length} files</span></div>
        <div className="overflow-hidden rounded-xl border bg-card"><Table><TableHeader><TableRow className="hover:bg-transparent"><TableHead className="pl-4">Name</TableHead><TableHead className="hidden md:table-cell">Modified</TableHead><TableHead className="hidden sm:table-cell">File size</TableHead><TableHead className="w-12 pr-3"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
          <TableBody>{files.map((file) => <TableRow key={file.id}><TableCell className="min-w-56 py-3 pl-4"><div className="flex min-w-0 items-center gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700"><FileIcon file={file} /></div><div className="min-w-0"><p className="truncate font-medium">{file.filename}</p><p className="mt-0.5 text-xs text-muted-foreground">{fileType(file)}</p></div></div></TableCell><TableCell className="hidden text-muted-foreground md:table-cell">{file.updatedAt && !Number.isNaN(Date.parse(file.updatedAt)) ? new Date(file.updatedAt).toLocaleDateString() : '—'}</TableCell><TableCell className="hidden text-muted-foreground sm:table-cell">{formatSize(file.sizeBytes)}</TableCell><TableCell className="pr-3 text-right"><DropdownMenu><DropdownMenuTrigger aria-label={`Actions for ${file.filename}`} render={<Button size="icon" variant="ghost" />}><MoreHorizontal /></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-44"><DropdownMenuItem onClick={() => void perform(() => api.downloadFile(file.id, file.filename), 'Download started.')}>Download</DropdownMenuItem><DropdownMenuItem onClick={() => void renameFile(file)}>Rename</DropdownMenuItem><DropdownMenuItem onClick={() => void moveFile(file)}>Move</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => void perform(() => api.trashFile(file.id), 'File moved to Trash.')} variant="destructive">Move to Trash</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>)}
            {!files.length && <TableRow><TableCell className="py-8 text-center text-sm text-muted-foreground" colSpan={4}>No files in this folder yet. Upload a file to get started.</TableCell></TableRow>}
          </TableBody></Table></div>
      </section>
    </div>
  )
}
