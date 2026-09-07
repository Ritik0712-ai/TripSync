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
import type { Stop } from '@/types/database'

const CATEGORIES = [
  'attraction',
  'food',
  'hotel',
  'activity',
  'transport',
  'shopping',
] as const

interface StopFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tripId: string
  dayId: string
  /** Omit to add a new stop; pass one to edit it. */
  stop?: Stop | null
  onSaved: () => void
}

export function StopFormDialog({
  open,
  onOpenChange,
  tripId,
  dayId,
  stop,
  onSaved,
}: StopFormDialogProps) {
  const isEdit = Boolean(stop)

  // State is initialised straight from props rather than synced in an effect.
  // The parent renders this component only while it is open and gives it a key
  // that changes per target, so every open is a fresh mount with fresh state.
  const [placeName, setPlaceName] = useState(stop?.place_name ?? '')
  const [category, setCategory] = useState<string>(stop?.category ?? 'attraction')
  const [address, setAddress] = useState(stop?.address ?? '')
  // <input type="time"> wants HH:MM; Postgres hands back HH:MM:SS.
  const [startTime, setStartTime] = useState(
    stop?.start_time ? String(stop.start_time).slice(0, 5) : ''
  )
  const [duration, setDuration] = useState(String(stop?.duration_minutes ?? 60))
  const [cost, setCost] = useState(String(stop?.estimated_cost ?? 0))
  const [notes, setNotes] = useState(stop?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    if (!placeName.trim()) {
      setError('Give the stop a name')
      return
    }

    setSaving(true)
    setError(null)

    const body = {
      day_id: dayId,
      place_name: placeName.trim(),
      category,
      address: address.trim() || null,
      start_time: startTime || null,
      duration_minutes: Number(duration) || 60,
      estimated_cost: Number(cost) || 0,
      notes: notes.trim() || null,
    }

    try {
      const response = await fetch(
        isEdit ? `/api/trips/${tripId}/stops/${stop!.id}` : `/api/trips/${tripId}/stops`,
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        }
      )

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not save the stop')

      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the stop')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit stop' : 'Add a stop'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the details for this stop.'
              : 'It will be added to the end of this day.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stop-name">Place</Label>
            <Input
              id="stop-name"
              value={placeName}
              onChange={(e) => setPlaceName(e.target.value)}
              placeholder="Amber Fort"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="stop-category">Category</Label>
              <select
                id="stop-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white capitalize"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stop-time">Start time</Label>
              <Input
                id="stop-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="stop-duration">Duration (min)</Label>
              <Input
                id="stop-duration"
                type="number"
                min={0}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stop-cost">Estimated cost</Label>
              <Input
                id="stop-cost"
                type="number"
                min={0}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stop-address">Address</Label>
            <Input
              id="stop-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Devisinghpura, Amer, Jaipur"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stop-notes">Notes</Label>
            <Input
              id="stop-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Go early to beat the crowds"
            />
          </div>

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
            {isEdit ? 'Save changes' : 'Add stop'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
