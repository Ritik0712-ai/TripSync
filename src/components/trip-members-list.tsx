'use client'

import { useState, useEffect, useCallback } from 'react'
import { MoreHorizontal, Trash2, Shield, Pencil, Eye } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Trip, Profile } from '@/types/database'

interface TripMemberWithProfile {
  trip_id: string
  user_id: string
  role: 'owner' | 'editor' | 'viewer'
  joined_at: string | null
  profiles: Profile | null
}

interface TripMembersListProps {
  trip: Trip
  currentUserId: string
  onMembersChange?: () => void
}

export function TripMembersList({ trip, currentUserId, onMembersChange }: TripMembersListProps) {
  const [members, setMembers] = useState<TripMemberWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const isOwner = trip.owner_id === currentUserId

  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch(`/api/trips/${trip.id}/members`)
      const data = await response.json()

      if (!response.ok) throw new Error(data.error)
      setMembers(data.members || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }, [trip.id])

  useEffect(() => {
    // Guarded against a late response from a previous trip.id overwriting the
    // current one, and kept off the synchronous effect path.
    let cancelled = false

    void (async () => {
      try {
        const response = await fetch(`/api/trips/${trip.id}/members`)
        const data = await response.json()
        if (cancelled) return

        if (!response.ok) throw new Error(data.error)
        setMembers(data.members || [])
        setError(null)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load members')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [trip.id])

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return
    
    try {
      const response = await fetch(`/api/trips/${trip.id}/members/${userId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }
      
      fetchMembers()
      onMembersChange?.()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove member')
    }
  }

  const handleLeaveTrip = async () => {
    if (!confirm('Are you sure you want to leave this trip?')) return
    
    try {
      const response = await fetch(`/api/trips/${trip.id}/members/${currentUserId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }
      
      window.location.href = '/dashboard'
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to leave trip')
    }
  }

  const handleChangeRole = async (userId: string, newRole: 'editor' | 'viewer') => {
    try {
      const response = await fetch(`/api/trips/${trip.id}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error)
      }
      
      fetchMembers()
      onMembersChange?.()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update role')
    }
  }

  const getInitials = (name: string | null | undefined, email?: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return '?'
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'default' as const
      case 'editor':
        return 'secondary' as const
      case 'viewer':
        return 'outline' as const
      default:
        return 'outline' as const
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Shield className="h-3 w-3" />
      case 'editor':
        return <Pencil className="h-3 w-3" />
      case 'viewer':
        return <Eye className="h-3 w-3" />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p>{error}</p>
        <Button variant="link" onClick={fetchMembers} className="mt-2">
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Trip Members ({members.length})</h3>
        {!isOwner && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLeaveTrip}
            className="text-destructive hover:text-destructive"
          >
            Leave Trip
          </Button>
        )}
      </div>
      
      <div className="space-y-3">
        {members.map((member) => {
          const isCurrentUser = member.user_id === currentUserId
          const isMemberOwner = member.role === 'owner'
          
          return (
            <div 
              key={member.user_id} 
              className={`flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors ${
                isCurrentUser ? 'bg-muted/30' : ''
              }`}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={member.profiles?.avatar_url || undefined} />
                <AvatarFallback>
                  {getInitials(member.profiles?.full_name, member.profiles?.username)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {member.profiles?.full_name || member.profiles?.username || 'Unknown User'}
                  </span>
                  {isCurrentUser && (
                    <Badge variant="outline" className="text-xs">You</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {member.profiles?.username ? `@${member.profiles.username}` : member.user_id.slice(0, 8)}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant={getRoleBadgeVariant(member.role)} className="gap-1">
                  {getRoleIcon(member.role)}
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </Badge>
                
                {isOwner && !isMemberOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      {member.role !== 'editor' && (
                        <DropdownMenuItem onClick={() => handleChangeRole(member.user_id, 'editor')}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Make Editor
                        </DropdownMenuItem>
                      )}
                      
                      {member.role !== 'viewer' && (
                        <DropdownMenuItem onClick={() => handleChangeRole(member.user_id, 'viewer')}>
                          <Eye className="mr-2 h-4 w-4" />
                          Make Viewer
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem 
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
