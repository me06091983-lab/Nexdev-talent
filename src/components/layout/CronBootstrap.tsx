'use client'
import { useEffect } from 'react'

export function CronBootstrap() {
  useEffect(() => {
    fetch('/api/cron/check-contracts', { cache: 'no-store' }).catch(() => {})
  }, [])
  return null
}
