'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Pencil, Trash2, X, CheckCircle } from 'lucide-react'

interface Client {
  id: string
  name: string
  collaboration_start: string | null
  location: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  fieldglass_enabled: boolean
}

export function ClientsClient({ clients }: { clients: Client[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const filtered = clients.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) ||
      c.location?.toLowerCase().includes(q) ||
      c.contact_name?.toLowerCase().includes(q)
  })

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Ștergi clientul "${name}"?\nAcesta nu poate fi șters dacă are roluri asociate.`)) return
    setDeleting(id)
    setDeleteError('')
    const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
    const data = await res.json()
    setDeleting(null)
    if (!res.ok) {
      setDeleteError(data.error)
      return
    }
    router.refresh()
  }

  return (
    <div>
      {deleteError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4 flex items-center justify-between">
          {deleteError}
          <button onClick={() => setDeleteError('')} className="ml-3 text-red-400 hover:text-red-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filtru */}
      <div className="glass rounded-2xl p-4 mb-6">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Caută după nume, locație sau contact..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2AA3FF]" />
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">
          {filtered.length} {filtered.length === 1 ? 'client' : 'clienți'}
          {search && <span className="text-gray-400"> din {clients.length} total</span>}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-gray-400">Niciun client găsit{search ? ' pentru căutarea curentă' : ''}.</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/40 bg-white/30 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Locație</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Persoană contact</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Început colaborare</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fieldglass</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 text-sm">{c.name}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.location ?? '—'}</td>
                  <td className="px-4 py-3">
                    {c.contact_name ? (
                      <div>
                        <div className="text-sm text-gray-700">{c.contact_name}</div>
                        <div className="text-xs text-gray-400 mt-0.5 space-x-2">
                          {c.contact_email && <span>{c.contact_email}</span>}
                          {c.contact_phone && <span>{c.contact_phone}</span>}
                        </div>
                      </div>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {c.collaboration_start
                      ? new Date(c.collaboration_start).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {c.fieldglass_enabled
                      ? <CheckCircle size={16} className="text-green-500" />
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/clients/${c.id}`}
                        className="p-1.5 text-gray-400 hover:text-[#2AA3FF] hover:bg-blue-50 rounded transition-colors"
                        title="Editează">
                        <Pencil size={15} />
                      </Link>
                      <button onClick={() => handleDelete(c.id, c.name)}
                        disabled={deleting === c.id}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Șterge">
                        <Trash2 size={15} />
                      </button>
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
