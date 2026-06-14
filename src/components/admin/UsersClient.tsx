'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil, Loader2, AlertCircle, X, ShieldCheck, UserRound, Phone, Mail, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserRow {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  role: 'admin' | 'recruiter'
  enabled: boolean
  created_at: string
  last_sign_in_at: string | null
}

interface FormState {
  first_name: string
  last_name: string
  phone: string
  email: string
  password: string
  confirm_password: string
  role: 'admin' | 'recruiter'
  enabled: boolean
}

function emptyForm(): FormState {
  return {
    first_name: '', last_name: '', phone: '', email: '',
    password: '', confirm_password: '',
    role: 'recruiter', enabled: true,
  }
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('ro-RO', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function displayName(u: UserRow) {
  const full = [u.first_name, u.last_name].filter(Boolean).join(' ')
  return full || u.email
}

export function UsersClient({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers]       = useState<UserRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [form, setForm]             = useState<FormState>(emptyForm())
  const [showPass, setShowPass]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [formError, setFormError]   = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) setUsers((await res.json()).users)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(p => ({ ...p, [k]: v }))
    setFormError('')
  }

  function openAdd() {
    setEditingId(null)
    setForm(emptyForm())
    setFormError('')
    setShowPass(false)
    setShowConfirm(false)
    setShowForm(true)
  }

  function openEdit(u: UserRow) {
    setEditingId(u.id)
    setForm({
      first_name: u.first_name, last_name: u.last_name, phone: u.phone,
      email: u.email, password: '', confirm_password: '',
      role: u.role, enabled: u.enabled,
    })
    setFormError('')
    setShowPass(false)
    setShowConfirm(false)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setFormError('')
  }

  async function handleSubmit() {
    setFormError('')

    if (!editingId) {
      if (!form.email.trim())    { setFormError('Emailul este obligatoriu.'); return }
      if (!form.password)        { setFormError('Parola este obligatorie.'); return }
    }
    if (form.password && form.password.length < 6) {
      setFormError('Parola trebuie să aibă cel puțin 6 caractere.')
      return
    }
    if (form.password !== form.confirm_password) {
      setFormError('Parolele nu coincid.')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        const body: Record<string, unknown> = {
          first_name: form.first_name,
          last_name:  form.last_name,
          phone:      form.phone,
          role:       form.role,
          enabled:    form.enabled,
        }
        if (form.password) body.password = form.password

        const res = await fetch(`/api/admin/users/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) { setFormError((await res.json()).error ?? 'Eroare la actualizare.'); return }
      } else {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email:      form.email.trim(),
            password:   form.password,
            first_name: form.first_name,
            last_name:  form.last_name,
            phone:      form.phone,
            role:       form.role,
            enabled:    form.enabled,
          }),
        })
        if (!res.ok) { setFormError((await res.json()).error ?? 'Eroare la creare.'); return }
      }
      closeForm()
      fetchUsers()
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleEnabled(u: UserRow) {
    setTogglingId(u.id)
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !u.enabled }),
      })
      if (!res.ok) alert((await res.json()).error ?? 'Eroare.')
      else fetchUsers()
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Ștergi utilizatorul "${name}"? Acțiunea este ireversibilă.`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      if (!res.ok) { alert((await res.json()).error ?? 'Eroare la ștergere.'); return }
      fetchUsers()
    } finally {
      setDeletingId(null)
    }
  }

  const editingUser = editingId ? users.find(u => u.id === editingId) : null

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilizatori</h1>
          <p className="text-sm text-gray-500 mt-0.5">Conturi de acces la platforma NexDev Talent</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-[#0B1A33] hover:bg-[#0B1A33]/90 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus size={16} />
          Utilizator nou
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4 max-w-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 text-sm">
              {editingId ? `Editează: ${displayName(editingUser!)}` : 'Utilizator nou'}
            </h3>
            <button onClick={closeForm} className="p-1 text-gray-400 hover:text-gray-600 rounded">
              <X size={16} />
            </button>
          </div>

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Prenume</label>
              <input
                type="text"
                value={form.first_name}
                onChange={e => set('first_name', e.target.value)}
                placeholder="Ion"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nume</label>
              <input
                type="text"
                value={form.last_name}
                onChange={e => set('last_name', e.target.value)}
                placeholder="Popescu"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/30"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              <span className="inline-flex items-center gap-1"><Phone size={11} /> Telefon</span>
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="+40 7xx xxx xxx"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/30"
            />
          </div>

          {/* Email — only on create */}
          {!editingId ? (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                <span className="inline-flex items-center gap-1"><Mail size={11} /> Email *</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="email@nexdev.vip"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/30"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <Mail size={13} className="text-gray-400 flex-shrink-0" />
              <span className="text-sm text-gray-600">{editingUser?.email}</span>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {editingId ? 'Parolă nouă (gol = neschimbată)' : 'Parolă *'}
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="Minim 6 caractere"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]/30"
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {editingId ? 'Confirmare parolă nouă' : 'Repetare parolă *'}
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={form.confirm_password}
                onChange={e => set('confirm_password', e.target.value)}
                placeholder="Repetă parola"
                className={cn(
                  'w-full border rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2',
                  form.confirm_password && form.password !== form.confirm_password
                    ? 'border-red-300 bg-red-50 focus:ring-red-300/30'
                    : 'border-gray-200 focus:ring-[#2AA3FF]/30'
                )}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(p => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {form.confirm_password && form.password !== form.confirm_password && (
              <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={10} /> Parolele nu coincid.
              </p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Rol *</label>
            <div className="flex gap-2">
              {(['admin', 'recruiter'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => set('role', r)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm font-medium transition-colors',
                    form.role === r
                      ? r === 'admin'
                        ? 'bg-[#0B1A33] border-[#0B1A33] text-white'
                        : 'bg-[#2AA3FF] border-[#2AA3FF] text-white'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  {r === 'admin' ? <ShieldCheck size={14} /> : <UserRound size={14} />}
                  {r === 'admin' ? 'Admin' : 'Recruiter'}
                </button>
              ))}
            </div>
          </div>

          {/* Enable / Disable */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Cont activ</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {form.enabled ? 'Utilizatorul se poate loga.' : 'Utilizatorul nu se poate loga.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => set('enabled', !form.enabled)}
              disabled={editingId === currentUserId}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed',
                form.enabled ? 'bg-green-500' : 'bg-gray-300'
              )}
            >
              <span className={cn(
                'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                form.enabled ? 'translate-x-5' : 'translate-x-0'
              )} />
            </button>
          </div>

          {formError && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={12} /> {formError}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={closeForm}
              className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Anulează
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 py-2.5 text-sm bg-[#0B1A33] hover:bg-[#0B1A33]/90 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving
                ? <><Loader2 size={13} className="animate-spin" /> Salvez...</>
                : editingId ? 'Salvează modificările' : 'Creează cont'}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 gap-2">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Se încarcă...</span>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Utilizator</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ultima autentificare</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={cn(
                  'border-b border-gray-50 hover:bg-gray-50/40 transition-colors',
                  !u.enabled && 'opacity-60'
                )}>
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      {displayName(u)}
                      {u.id === currentUserId && (
                        <span className="text-[10px] font-semibold bg-blue-50 text-blue-500 border border-blue-100 rounded-full px-1.5 py-0.5">
                          tu
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2.5">
                      <span className="flex items-center gap-1">
                        <Mail size={10} /> {u.email}
                      </span>
                      {u.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={10} /> {u.phone}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-1',
                      u.role === 'admin'
                        ? 'bg-[#0B1A33]/5 text-[#0B1A33]'
                        : 'bg-blue-50 text-blue-600'
                    )}>
                      {u.role === 'admin' ? <ShieldCheck size={11} /> : <UserRound size={11} />}
                      {u.role === 'admin' ? 'Admin' : 'Recruiter'}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleEnabled(u)}
                      disabled={togglingId === u.id || u.id === currentUserId}
                      title={u.id === currentUserId ? 'Nu poți dezactiva propriul cont' : u.enabled ? 'Dezactivează' : 'Activează'}
                      className={cn(
                        'relative inline-flex w-10 h-5 rounded-full transition-colors focus:outline-none disabled:cursor-not-allowed',
                        u.enabled ? 'bg-green-500' : 'bg-gray-300',
                        togglingId === u.id && 'opacity-50'
                      )}
                    >
                      <span className={cn(
                        'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                        u.enabled ? 'translate-x-5' : 'translate-x-0'
                      )} />
                    </button>
                  </td>

                  <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(u.last_sign_in_at)}</td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-1.5 text-gray-400 hover:text-[#2AA3FF] hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editează"
                      >
                        <Pencil size={14} />
                      </button>
                      {u.id !== currentUserId && (
                        <button
                          onClick={() => handleDelete(u.id, displayName(u))}
                          disabled={deletingId === u.id}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                          title="Șterge"
                        >
                          {deletingId === u.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Trash2 size={14} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
