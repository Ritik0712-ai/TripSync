'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { Stop } from '@/types/database'

interface StopSortableProps {
  stop: Stop
  children: React.ReactNode
  dragHandle?: React.ReactNode
}

export function StopSortable({ stop, children, dragHandle }: StopSortableProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Drag handle — only shown when dragHandle prop provided */}
      {dragHandle && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-0 top-0 bottom-0 flex items-center px-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}
      <div className={dragHandle ? 'pl-6' : ''}>{children}</div>
    </div>
  )
}
