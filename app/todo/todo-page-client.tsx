'use client'

// Todoページ：個人Todo・受け取ったTodo・送ったTodoを管理する
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CheckCheck, CheckCircle2, Clock, Plus, Send, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { PersonalTodo, ReceivedTodo, SentTodo } from '@/lib/core/todo'

type Employee = { id: string; name: string; role: string }

const ROLE_LABELS: Record<string, string> = {
  DRIVER: 'ドライバー', ADMIN: '管理者', OWNER: '経営者',
}

function isOverdue(due_date: string | null) {
  if (!due_date) return false
  return due_date < new Date().toISOString().slice(0, 10)
}

function DueLabel({ due_date }: { due_date: string | null }) {
  if (!due_date) return null
  const over = isOverdue(due_date)
  return (
    <span className={`flex items-center gap-1 text-xs ${over ? 'font-semibold text-red-600' : 'text-muted-foreground'}`}>
      <Clock className="size-3" />{over ? '期日超過: ' : '期日: '}{due_date}
    </span>
  )
}

function LoadingSkeleton() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-52" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36" /><Skeleton className="h-9 w-36" />
        </div>
        {[0, 1, 2].map(i => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-4 w-28" /></CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}

export function TodoPageClient() {
  const [personal, setPersonal] = useState<PersonalTodo[]>([])
  const [received, setReceived] = useState<ReceivedTodo[]>([])
  const [sent, setSent] = useState<SentTodo[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showPersonalForm, setShowPersonalForm] = useState(false)
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDue, setNewDue] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  function addProcessing(id: string) { setProcessingIds(p => new Set([...p, id])) }
  function removeProcessing(id: string) { setProcessingIds(p => { const s = new Set(p); s.delete(id); return s }) }

  // Todoデータのみ再取得（操作後に使用。社員一覧は変わらないため取得しない）
  async function loadTodos() {
    const [myRes, sentRes] = await Promise.all([fetch('/api/todo'), fetch('/api/todo/sent')])
    if (myRes.ok) { const d = await myRes.json(); setPersonal(d.personal); setReceived(d.received) }
    if (sentRes.ok) setSent(await sentRes.json())
  }

  // 初回のみ全データを1リクエストで取得（sent・社員一覧含む）
  async function load() {
    const res = await fetch('/api/todo?with=sent,employees')
    if (res.ok) {
      const d = await res.json()
      if (d.personal != null) setPersonal(d.personal)
      if (d.received != null) setReceived(d.received)
      if (d.sent != null) setSent(d.sent)
      if (Array.isArray(d.employees)) setEmployees(d.employees)
    }
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function handleCreatePersonal() {
    if (!newTitle.trim()) return
    setSubmitting(true)
    const res = await fetch('/api/todo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'personal', title: newTitle.trim(), due_date: newDue || undefined }),
    })
    setSubmitting(false)
    if (res.ok) {
      toast.success('Todoを追加しました')
      setNewTitle(''); setNewDue(''); setShowPersonalForm(false)
      void loadTodos()
    } else toast.error('追加に失敗しました')
  }

  async function handleCreateAssigned() {
    if (!newTitle.trim() || selectedIds.length === 0) return
    setSubmitting(true)
    const res = await fetch('/api/todo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'assigned', title: newTitle.trim(), assignee_ids: selectedIds, due_date: newDue || undefined }),
    })
    setSubmitting(false)
    if (res.ok) {
      toast.success('Todoを送信しました')
      setNewTitle(''); setNewDue(''); setSelectedIds([]); setShowAssignForm(false)
      void loadTodos()
    } else toast.error('送信に失敗しました')
  }

  async function handleDeletePersonal(id: string) {
    const prev = personal
    setPersonal(p => p.filter(t => t.id !== id))
    const res = await fetch(`/api/todo/${id}?type=personal`, { method: 'DELETE' })
    if (res.ok) toast.success('削除しました')
    else { setPersonal(prev); toast.error('削除に失敗しました') }
  }

  async function handleDeleteAssigned(id: string) {
    const prev = sent
    setSent(s => s.filter(t => t.id !== id))
    const res = await fetch(`/api/todo/${id}?type=assigned`, { method: 'DELETE' })
    if (res.ok) toast.success('削除しました')
    else { setSent(prev); toast.error('削除に失敗しました') }
  }

  // 楽観的更新: 確認済みにする（即座にバッジを表示）
  async function handleConfirm(assignment_id: string) {
    addProcessing(assignment_id)
    const prev = received
    setReceived(r => r.map(t => t.assignment_id === assignment_id ? { ...t, confirmed_at: new Date().toISOString() } : t))
    const res = await fetch(`/api/todo/${assignment_id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm' }),
    })
    removeProcessing(assignment_id)
    if (!res.ok) { setReceived(prev); toast.error('操作に失敗しました') }
    else toast.success('確認済みにしました')
  }

  // 楽観的更新: 対応済みにする（即座に一覧から消える）
  async function handleComplete(assignment_id: string) {
    addProcessing(assignment_id)
    const prev = received
    setReceived(r => r.filter(t => t.assignment_id !== assignment_id))
    const res = await fetch(`/api/todo/${assignment_id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete' }),
    })
    removeProcessing(assignment_id)
    if (!res.ok) { setReceived(prev); toast.error('操作に失敗しました') }
    else { toast.success('対応済みにしました'); void loadTodos() }
  }

  function toggleEmployee(id: string) {
    setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }

  if (loading) return <LoadingSkeleton />

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 md:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Todo</h1>
          <p className="text-sm text-muted-foreground">タスクを管理・共有できます</p>
        </div>

        {/* アクションボタン */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={showPersonalForm ? 'default' : 'outline'}
            onClick={() => { setShowPersonalForm(v => !v); setShowAssignForm(false) }}>
            <Plus className="mr-1 size-4" />自分用Todoを追加
          </Button>
          <Button size="sm" variant={showAssignForm ? 'default' : 'outline'}
            onClick={() => { setShowAssignForm(v => !v); setShowPersonalForm(false) }}>
            <Send className="mr-1 size-4" />誰かにTodoを送る
          </Button>
        </div>

        {/* 個人Todo作成フォーム */}
        {showPersonalForm && (
          <Card>
            <CardHeader><CardTitle className="text-sm">自分用Todoを追加</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Todoの内容" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && void handleCreatePersonal()} autoFocus />
              <div className="flex items-center gap-2">
                <label className="whitespace-nowrap text-sm text-muted-foreground">期日（任意）</label>
                <Input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} className="w-40" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void handleCreatePersonal()} disabled={submitting || !newTitle.trim()}>
                  {submitting ? '追加中...' : '追加'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowPersonalForm(false)}>キャンセル</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 割り当てTodo作成フォーム */}
        {showAssignForm && (
          <Card>
            <CardHeader><CardTitle className="text-sm">誰かにTodoを送る</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Todoの内容" value={newTitle} onChange={e => setNewTitle(e.target.value)} autoFocus />
              <div className="flex items-center gap-2">
                <label className="whitespace-nowrap text-sm text-muted-foreground">期日（任意）</label>
                <Input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} className="w-40" />
              </div>
              <div>
                <p className="mb-2 text-sm text-muted-foreground">送信先（複数選択可）</p>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                  {employees.length === 0 ? <p className="text-xs text-muted-foreground">社員が見つかりません</p>
                    : employees.map(emp => (
                      <label key={emp.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-muted">
                        <input type="checkbox" className="size-3.5" checked={selectedIds.includes(emp.id)} onChange={() => toggleEmployee(emp.id)} />
                        <span className="text-sm">{emp.name}</span>
                        <Badge variant="outline" className="text-xs">{ROLE_LABELS[emp.role] ?? emp.role}</Badge>
                      </label>
                    ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void handleCreateAssigned()} disabled={submitting || !newTitle.trim() || selectedIds.length === 0}>
                  {submitting ? '送信中...' : `送信（${selectedIds.length}人）`}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAssignForm(false)}>キャンセル</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 自分のTodo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              自分のTodo{personal.length > 0 && <span className="ml-2 font-semibold text-foreground">{personal.length}件</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {personal.length === 0 ? <p className="text-sm text-muted-foreground">個人Todoはありません</p> : (
              <ul className="divide-y">
                {personal.map(t => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm ${isOverdue(t.due_date) ? 'font-medium text-red-600' : ''}`}>{t.title}</p>
                      <DueLabel due_date={t.due_date} />
                    </div>
                    <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground hover:text-red-600"
                      onClick={() => void handleDeletePersonal(t.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 受け取ったTodo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              受け取ったTodo{received.length > 0 && <span className="ml-2 font-semibold text-foreground">{received.length}件</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {received.length === 0 ? <p className="text-sm text-muted-foreground">受け取ったTodoはありません</p> : (
              <ul className="space-y-3">
                {received.map(t => {
                  const over = isOverdue(t.due_date)
                  const busy = processingIds.has(t.assignment_id)
                  return (
                    <li key={t.assignment_id}
                      className={`rounded-lg border p-3 transition-opacity ${over ? 'border-red-200 bg-red-50' : ''} ${busy ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${over ? 'text-red-700' : ''}`}>{t.title}</p>
                          <p className="text-xs text-muted-foreground">{t.creator_name}から</p>
                          <DueLabel due_date={t.due_date} />
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          {t.confirmed_at ? (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle2 className="mr-1 size-3" />確認済み
                            </Badge>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy}
                              onClick={() => void handleConfirm(t.assignment_id)}>
                              確認済みにする
                            </Button>
                          )}
                          <Button size="sm" className="h-7 text-xs" disabled={busy}
                            onClick={() => void handleComplete(t.assignment_id)}>
                            <CheckCheck className="mr-1 size-3" />対応済みにする
                          </Button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 送ったTodo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              送ったTodo{sent.length > 0 && <span className="ml-2 font-semibold text-foreground">{sent.length}件</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sent.length === 0 ? <p className="text-sm text-muted-foreground">送ったTodoはありません</p> : (
              <ul className="space-y-3">
                {sent.map(t => {
                  const doneCount = t.assignments.filter(a => a.completed_at).length
                  return (
                    <li key={t.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{t.title}</p>
                          <div className="mt-1">
                            <Badge variant={doneCount === t.assignments.length ? 'default' : 'secondary'} className="text-xs">
                              {doneCount}/{t.assignments.length}人対応済み
                            </Badge>
                          </div>
                          <DueLabel due_date={t.due_date} />
                          <ul className="mt-2 space-y-1">
                            {t.assignments.map(a => (
                              <li key={a.assignee_id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="font-medium">{a.assignee_name}</span>
                                <span className={a.confirmed_at ? 'text-green-600' : ''}>{a.confirmed_at ? '✓確認済' : '○未確認'}</span>
                                <span className={a.completed_at ? 'text-green-600' : ''}>{a.completed_at ? '✓対応済' : '○未対応'}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <Button variant="ghost" size="sm" className="shrink-0 text-muted-foreground hover:text-red-600"
                          onClick={() => void handleDeleteAssigned(t.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
