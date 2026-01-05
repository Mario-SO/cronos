import { useState, useReducer, useRef, useEffect } from "react"
import { Effect } from "effect"
import { useKeyboard, type ScrollBoxRenderable } from "@opentui/react"
import type { CalendarEvent } from "../types"
import { THEME, getColorHex } from "../lib/colors"
import { formatTimeRange, formatDateKey } from "../lib/dateUtils"
import { deleteEvent, useEventsForDate } from "../state/events"

interface ViewEventsModalProps {
  selectedDate: Date
  onClose: () => void
  onEdit: (event: CalendarEvent) => void
}

export function ViewEventsModal({ selectedDate, onClose, onEdit }: ViewEventsModalProps) {
  const dateKey = formatDateKey(selectedDate)
  const events = useEventsForDate(dateKey)
  const [selectedIndex, setSelectedIndex] = useState(0)
  // Force re-render after delete since events come from external store
  const [, forceUpdate] = useReducer((x) => x + 1, 0)
  
  // Clamp selectedIndex if events list shrunk (e.g., after delete)
  const clampedIndex = Math.min(selectedIndex, Math.max(0, events.length - 1))

  useKeyboard((key) => {
    if (key.name === "escape" || key.name === "v") {
      onClose()
      return
    }

    if (events.length === 0) return

    if (key.name === "j" || key.name === "down") {
      setSelectedIndex((prev) => Math.min(prev + 1, events.length - 1))
    } else if (key.name === "k" || key.name === "up") {
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (key.name === "h" || key.name === "left") {
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (key.name === "l" || key.name === "right") {
      setSelectedIndex((prev) => Math.min(prev + 1, events.length - 1))
    } else if (key.name === "e") {
      const event = events[selectedIndex]
      if (event) {
        onEdit(event)
      }
    } else if (key.name === "d") {
      const event = events[selectedIndex]
      if (event) {
        Effect.runSync(deleteEvent(event.id))
        // Adjust selection if we're at the end
        if (selectedIndex >= events.length - 1 && selectedIndex > 0) {
          setSelectedIndex(selectedIndex - 1)
        }
        // Force re-render to reflect the deletion immediately
        forceUpdate()
      }
    }
  })

  const formattedDate = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  const maxVisibleEvents = 6
  const scrollboxRef = useRef<ScrollBoxRenderable>(null)
  
  // Scroll to keep selected item visible
  useEffect(() => {
    if (scrollboxRef.current && events.length > 0) {
      // Each event row is 1 line tall, calculate target scroll position
      const targetScrollTop = Math.max(0, clampedIndex - maxVisibleEvents + 1)
      scrollboxRef.current.scrollTop = targetScrollTop
    }
  }, [clampedIndex, events.length])

  return (
    <box
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: 50,
        height: 16,
        marginTop: -8,
        marginLeft: -25,
        backgroundColor: THEME.background,
        border: true,
        borderStyle: "double",
        borderColor: THEME.borderHighlight,
        flexDirection: "column",
        padding: 1,
      }}
    >
      {/* Title */}
      <text fg={THEME.selected} style={{ marginBottom: 1 }}>
        Events - {formattedDate}
      </text>

      {/* Event List */}
      <box
        style={{
          flexDirection: "column",
          height: maxVisibleEvents + 2,
          border: true,
          borderColor: THEME.border,
          overflow: "hidden",
        }}
      >
        {events.length === 0 ? (
          <text fg={THEME.foregroundDim} style={{ padding: 1 }}>
            No events for this day
          </text>
        ) : (
          <scrollbox ref={scrollboxRef} focused={false} style={{ height: maxVisibleEvents }}>
            {events.map((event, index) => {
              const isSelected = index === clampedIndex
              return (
                <box
                  key={event.id}
                  style={{
                    flexDirection: "row",
                    backgroundColor: isSelected ? THEME.backgroundAlt : undefined,
                    padding: 0,
                    paddingLeft: 1,
                  }}
                >
                  <text fg={getColorHex(event.color)}>●</text>
                  <text fg={THEME.foregroundDim} style={{ marginLeft: 1, width: 12 }}>
                    {formatTimeRange(event.startTime, event.endTime)}
                  </text>
                  <text fg={isSelected ? THEME.foreground : THEME.foregroundDim} style={{ marginLeft: 1 }}>
                    {event.title.slice(0, 28)}
                  </text>
                  {isSelected && (
                    <text fg={THEME.selected} style={{ marginLeft: 1 }}>
                      ◀
                    </text>
                  )}
                </box>
              )
            })}
          </scrollbox>
        )}
      </box>

      {/* Help */}
      <box style={{ marginTop: 1 }}>
        <text fg={THEME.foregroundDim}>J/K Navigate | E Edit | D Delete | Esc/V Close</text>
      </box>
    </box>
  )
}
