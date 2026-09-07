'use client'

import { useState } from 'react'
import { Copy, Check, Link2, Users, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Trip } from '@/types/database'

interface TripShareDialogProps {
  trip: Trip
  currentUserId: string
  isOwner: boolean
  onMembersUpdate?: () => void
}

export function TripShareDialog({ trip, currentUserId, isOwner, onMembersUpdate }: TripShareDialogProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  
  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/join?token=${trip.share_token}`
    : ''

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleInvite = async () => {
    if (!email.trim()) return
    
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/trips/${trip.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role: inviteRole }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite member')
      }

      setSuccess(`${email} has been added as ${inviteRole}`)
      setEmail('')
      onMembersUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Link2 className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share Trip</DialogTitle>
          <DialogDescription>
            Share this trip with friends and collaborate on planning together.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link" className="gap-2">
              <Link2 className="h-4 w-4" />
              Share Link
            </TabsTrigger>
            {isOwner && (
              <TabsTrigger value="invite" className="gap-2">
                <Users className="h-4 w-4" />
                Invite
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="link" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="share-link">Shareable Link</Label>
              <div className="flex gap-2">
                <Input
                  id="share-link"
                  value={shareUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button 
                  size="sm" 
                  onClick={copyToClipboard}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can view and join this trip as an editor.
              </p>
            </div>
          </TabsContent>

          {isOwner && (
            <TabsContent value="invite" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email Address</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="friend@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="editor"
                      checked={inviteRole === 'editor'}
                      onChange={() => setInviteRole('editor')}
                      className="text-primary"
                    />
                    <div>
                      <span className="font-medium">Editor</span>
                      <p className="text-xs text-muted-foreground">Can add and edit stops</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="viewer"
                      checked={inviteRole === 'viewer'}
                      onChange={() => setInviteRole('viewer')}
                      className="text-primary"
                    />
                    <div>
                      <span className="font-medium">Viewer</span>
                      <p className="text-xs text-muted-foreground">Can only view the trip</p>
                    </div>
                  </label>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              {success && (
                <p className="text-sm text-green-600">{success}</p>
              )}

              <Button 
                onClick={handleInvite} 
                disabled={loading || !email.trim()}
                className="w-full"
              >
                {loading ? 'Inviting...' : 'Send Invitation'}
              </Button>
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter className="sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {isOwner ? 'As the owner, you can manage member permissions.' : 'Contact the trip owner to change your permissions.'}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
