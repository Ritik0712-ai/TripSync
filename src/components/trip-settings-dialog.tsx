'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Trip } from '@/types/database'

const STATUSES = ['planning', 'active', 'completed'] as const

interface TripSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trip: Trip
  onSaved: () => void
}

/**
 * Trip-level metadata. This needs no new endpoint — PATCH /api/trips/:id has
 * existed since the migration and only applies the fields present in the body,
 * so a partial edit here cannot blank out anything it doesn't send.
 */
export function TripSettingsDialog({
  open,
  onOpenChange,
  trip,
  onSaved,
}: TripSettingsDialogProps) {
  // Initialised from props, not synced in an effect: the parent mounts this
  // only while it is open, so each open starts from the current trip.
  const [title, setTitle] = useState(trip.title)
  const [destination, setDestination] = useState(trip.destination)
  const [startDate, setStartDate] = useState(trip.start_date ?? '')
  const [endDate, setEndDate] = useState(trip.end_date ?? '')
  const [budget, setBudget] = useState(String(trip.budget_total ?? 0))
  const [status, setStatus] = useState<string>(trip.status)
  const [isPublic, setIsPublic] = useState(Boolean(trip.is_public))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    if (!title.trim()) {
      setError('The trip needs a title')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/trips/${trip.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          destination: destination.trim(),
          startDate: startDate || null,
          endDate: endDate || null,
          budgetTotal: Number(budget) || 0,
          status,
          isPublic,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not save the trip')

      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the trip')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Trip details</DialogTitle>
          <DialogDescription>
            Rename the trip, change the dates, or adjust the budget.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trip-title">Title</Label>
            <Input id="trip-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trip-destination">Destination</Label>
            <Input
              id="trip-destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="trip-start">Start</Label>
              <Input
                id="trip-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trip-end">End</Label>
              <Input
                id="trip-end"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="trip-budget">Budget ({trip.currency})</Label>
              <Input
                id="trip-budget"
                type="number"
                min={0}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trip-status">Status</Label>
              <select
                id="trip-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white capitalize"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="font-medium">Anyone with the link can view</span>
              <span className="block text-xs text-muted-foreground">
                Lets people open the itinerary without signing in. They still
                cannot change anything.
              </span>
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md p-3">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
