'use client'

import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'

export interface ChartMonth {
  label: string
  count: number
  profit: number
}

function CountTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-0.5">{label}</p>
      <p className="text-[#2AA3FF]">{payload[0].value} contracts</p>
    </div>
  )
}

function ProfitTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const v = payload[0].value
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-0.5">{label}</p>
      <p className={v >= 0 ? 'text-green-600' : 'text-red-500'}>
        {v >= 0 ? '+' : ''}{v.toLocaleString('en-GB', { maximumFractionDigits: 0 })} EUR
      </p>
    </div>
  )
}

export function ContractsCharts({ data }: { data: ChartMonth[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1)

  return (
    <div className="grid grid-cols-2 gap-4 mb-5">
      {/* Grafic 1: nr contracte noi */}
      <div className="glass rounded-2xl p-4">
        <p className="text-xs font-semibold text-gray-600 mb-0.5">Active contracts / month</p>
        <p className="text-[10px] text-gray-400 mb-3">total active each month, last 12 months</p>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              domain={[0, maxCount + 1]}
            />
            <Tooltip content={<CountTooltip />} cursor={{ fill: '#f0f9ff' }} />
            <Bar dataKey="count" fill="#2AA3FF" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Grafic 2: profit net cumulat lunar */}
      <div className="glass rounded-2xl p-4">
        <p className="text-xs font-semibold text-gray-600 mb-0.5">Estimated monthly net profit</p>
        <p className="text-[10px] text-gray-400 mb-3">sum of net margins from active contracts each month</p>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
            />
            <Tooltip content={<ProfitTooltip />} cursor={{ stroke: '#e5e7eb' }} />
            <Area
              type="monotone"
              dataKey="profit"
              stroke="#22c55e"
              fill="#dcfce7"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#22c55e', stroke: 'white', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
