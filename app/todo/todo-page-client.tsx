'use client'

// Todoページ：個人Todo・受け取ったTodo・送ったTodoを管理する
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { PersonalTodo, ReceivedTodo, SentTodo } from '@/lib/core/todo'

type Employee = { id: string; name: string; role: string }

// 期日が過去かどうか
function isOverdue(due_date: string | null): boolean {
  if (!due_date) return false
  return due_date < new Date().toISOString().slice(0, 10)
}

// 期日表示
function DueLabel({ due_date }: { due_date: string | null }) {
  if (!due_date) return null
  const over = isOverdue(due_date)
  return (
    <span className={`text-xs ${over ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
      {over ? '⚠️ ' : ''}期日: {due_date}
    </span>
  )
}

export function TodoPageClient() {
  const [personal, setPersonal] = useState<PersonalTodo[]>([])
  const [received, setReceived] = useState<ReceivedTodo[]>([])
  const [sent, setSent] = useState<SentTodo[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  // 新規作成フォーム用
  const [showPersonalForm, setShowPersonalForm] = useState(false)
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDue, setNewDue] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    const [myRes, sentRes, empRes] = await Promise.all([
      fetch('/api/todo'),
      fetch('/api/todo/sent'),
      fetch('/api/employees'),
    ])
    if (myRes.ok) {
      const d = await myRes.json()
      setPersonal(d.personal)
      setReceived(d.received)
    }
    if (sentRes.ok) setSent(await sentRes.json())
    if (empRes.ok) setEmployees(await empRes.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // 個人Todo作成
  async function handleCreatePersonal() {
    if (!newTitle.trim()) return
    setSubmitting(true)
    const res = await fetch('/api/todo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'personal', title: newTitle.trim(), due_date: newDue || undefined }),
    })
    setSubmitting(false)
    if (res.ok) {
      toast.success('Todoを追加しました')
      setNewTitle(''); setNewDue(''); setShowPersonalForm(false)
      load()
    } else {
      toast.error('追加に失敗しました')
    }
  }

  // 割り当てTodo送信
  async function handleCreateAssigned() {
    if (!newTitle.trim() || selectedIds.length === 0) return
    setSubmitting(true)
    const res = await fetch('/api/todo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'assigned', title: newTitle.trim(), assignee_ids: selectedIds, due_date: newDue || undefined }),
    })
    setSubmitting(false)
    if (res.ok) {
      toast.success('Todoを送信しました')
      setNewTitle(''); setNewDue(''); setSelectedIds([]); setShowAssignForm(false)
      load()
    } else {
      toast.error('送信に失敗しました')
    }
  }

  // 個人Todo削除
  async function handleDeletePersonal(id: string) {
    const res = await fetch(`/api/todo/${id}?type=personal`, { method: 'DELETE' })
    if (res.ok) { toast.success('削除しました'); load() }
    else toast.error('削除に失敗しました')
  }

  // 割り当てTodo削除（作成者）
  async function handleDeleteAssigned(id: string) {
    const res = await fetch(`/api/todo/${id}?type=assigned`, { method: 'DELETE' })
    if (res.ok) { toast.success('削除しました'); load() }
    else toast.error('削除に失敗しました')
  }

  // 確認済み
  async function handleConfirm(assignment_id: string) {
    const res = await fetch(`/api/todo/${assignment_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'confirm' }),
    })
    if (res.ok) { toast.success('確認済みにしました'); load() }
    else toast.error('操作に失敗しました')
  }

  // 対応済み
  async function handleComplete(assignment_id: string) {
    const res = await fetch(`/api/todo/${assignment_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete' }),
    })
    if (res.ok) { toast.success('対応済みにしました'); load() }
    else toast.error('操作に失敗しました')
  }

  function toggleEmployee(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  if (loading) return <div className="p-6 text-gray-500">読み込み中...</div>

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      {/* ── ボタン行 ── */}
      <div className="flex gap-3">
        <Button onClick={() => { setShowPersonalForm(!showPersonalForm); setShowAssignForm(false) }}>
          ＋ 自分用Todoを追加
        </Button>
        <Button variant="outline" onClick={() => { setShowAssignForm(!showAssignForm); setShowPersonalForm(false) }}>
          ＋ 誰かにTodoを送る
        </Button>
      </div>

      {/* ── 個人Todo作成フォーム ── */}
      {showPersonalForm && (
        <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
          <Input placeholder="Todoの内容" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">期日（任意）</label>
            <Input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} className="w-40" />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreatePersonal} disabled={submitting || !newTitle.trim()}>追加</Button>
            <Button variant="ghost" onClick={() => setShowPersonalForm(false)}>キャンセル</Button>
          </div>
        </div>
      )}

      {/* ── 割り当てTodo作成フォーム ── */}
      {showAssignForm && (
        <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
          <Input placeholder="Todoの内容" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">期日（任意）</label>
            <Input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} className="w-40" />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">送信先（複数選択可）</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {employees.map((emp) => (
                <label key={emp.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(emp.id)}
                    onChange={() => toggleEmployee(emp.id)}
                  />
                  <span className="text-sm">{emp.name}</span>
                  <Badge variant="outline" className="text-xs">{emp.role}</Badge>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreateAssigned} disabled={submitting || !newTitle.trim() || selectedIds.length === 0}>
              送信
            </Button>
            <Button variant="ghost" onClick={() => setShowAssignForm(false)}>キャンセル</Button>
          </div>
        </div>
      )}

      {/* ── 自分のTodo ── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">自分のTodo</h2>
        {personal.length === 0 ? (
          <p className="text-gray-400 text-sm">個人Todoはありません</p>
        ) : (
          <ul className="space-y-2">
            {personal.map((t) => (
              <li key={t.id} className="flex items-center justify-between border rounded-lg px-4 py-3">
                <div>
                  <p className={`text-sm ${isOverdue(t.due_date) ? 'text-red-600 font-medium' : ''}`}>{t.title}</p>
                  <DueLabel due_date={t.due_date} />
                </div>
                <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeletePersonal(t.id)}>
                  削除
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── 受け取ったTodo ── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">受け取ったTodo</h2>
        {received.length === 0 ? (
          <p className="text-gray-400 text-sm">受け取ったTodoはありません</p>
        ) : (
          <ul className="space-y-3">
            {received.map((t) => (
              <li key={t.assignment_id} className={`border rounded-lg px-4 py-3 ${isOverdue(t.due_date) ? 'border-red-300 bg-red-50' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className={`text-sm font-medium ${isOverdue(t.due_date) ? 'text-red-700' : ''}`}>{t.title}</p>
                    <p className="text-xs text-gray-500">{t.creator_name}から</p>
                    <DueLabel due_date={t.due_date} />
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {t.confirmed_at ? (
                      <Badge variant="secondary" className="text-xs">確認済み</Badge>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleConfirm(t.assignment_id)}>
                        確認済みにする
                      </Button>
                    )}
                    <Button size="sm" onClick={() => handleComplete(t.assignment_id)}>
                      対応済みにする
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── 送ったTodo ── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">送ったTodo</h2>
        {sent.length === 0 ? (
          <p className="text-gray-400 text-sm">送ったTodoはありません</p>
        ) : (
          <ul className="space-y-3">
            {sent.map((t) => {
              const doneCount = t.assignments.filter((a) => a.completed_at).length
              return (
                <li key={t.id} className="border rounded-lg px-4 py-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-gray-500">{doneCount}/{t.assignments.length}人が対応済み</p>
                      <DueLabel due_date={t.due_date} />
                    </div>
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteAssigned(t.id)}>
                      削除
                    </Button>
                  </div>
                  <ul className="space-y-1 mt-2">
                    {t.assignments.map((a) => (
                      <li key={a.assignee_id} className="flex items-center gap-2 text-xs text-gray-600">
                        <span>{a.assignee_name}</span>
                        <span>{a.confirmed_at ? '✅確認済' : '⬜未確認'}</span>
                        <span>{a.completed_at ? '✅対応済' : '⬜未対応'}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
