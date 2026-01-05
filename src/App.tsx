import { useState, useCallback } from "react"
import { Effect, Ref } from "effect"
import { useKeyboard } from "@opentui/react"
import type { CalendarEvent, ModalType } from "./types"
import { THEME } from "./lib/colors"
import { CalendarView } from "./components/CalendarView"
import { AddEventModal } from "./components/AddEventModal"
import { ViewEventsModal } from "./components/ViewEventsModal"
import { GoToDateModal } from "./components/GoToDateModal"
import {
  calendarStateRef,
  goToPreviousMonth,
  goToNextMonth,
  selectPreviousDay,
  selectNextDay,
  selectPreviousWeek,
  selectNextWeek,
  jumpToToday,
  goToDate,
} from "./state/calendar"

export function App() {
  // Force re-render when state changes
  const [, forceUpdate] = useState(0)
  const triggerUpdate = useCallback(() => forceUpdate((n) => n + 1), [])

  // Read state synchronously
  const calendarState = Effect.runSync(Ref.get(calendarStateRef))

  // Modal state managed in React for simplicity
  const [modalType, setModalType] = useState<ModalType>("none")
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>(undefined)

  const runAndUpdate = useCallback(
    (effect: Effect.Effect<void>) => {
      Effect.runSync(effect)
      triggerUpdate()
    },
    [triggerUpdate]
  )

  // Global keyboard handler (only when no modal is open)
  useKeyboard((key) => {
    // Don't handle keys when modal is open
    if (modalType !== "none") {
      return
    }

    switch (key.name) {
      // Month navigation
      case "left":
        runAndUpdate(goToPreviousMonth)
        break
      case "right":
        runAndUpdate(goToNextMonth)
        break

      // Vim-style day navigation
      case "h":
        runAndUpdate(selectPreviousDay)
        break
      case "l":
        runAndUpdate(selectNextDay)
        break
      case "k":
        runAndUpdate(selectPreviousWeek)
        break
      case "j":
        runAndUpdate(selectNextWeek)
        break

      // Jump to today
      case "t":
        runAndUpdate(jumpToToday)
        break

      // Open modals
      case "a":
        setEditingEvent(undefined)
        setModalType("add")
        break
      case "v":
        setModalType("view")
        break
      case "g":
        setModalType("goto")
        break

      // Quit
      case "q":
        process.exit(0)
        break
    }
  })

  const handleCloseModal = useCallback(() => {
    setModalType("none")
    setEditingEvent(undefined)
    triggerUpdate()
  }, [triggerUpdate])

  const handleSaveEvent = useCallback(() => {
    setModalType("none")
    setEditingEvent(undefined)
    triggerUpdate()
  }, [triggerUpdate])

  const handleEditEvent = useCallback((event: CalendarEvent) => {
    setEditingEvent(event)
    setModalType("add")
  }, [])

  const handleGoToDate = useCallback(
    (date: Date) => {
      Effect.runSync(goToDate(date))
      setModalType("none")
      triggerUpdate()
    },
    [triggerUpdate]
  )

  return (
    <box
      style={{
        flexGrow: 1,
        backgroundColor: THEME.background,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Calendar View */}
      <CalendarView state={calendarState} />

      {/* Modals */}
      {modalType === "add" && (
        <AddEventModal
          selectedDate={calendarState.selectedDate}
          editingEvent={editingEvent}
          onClose={handleCloseModal}
          onSave={handleSaveEvent}
        />
      )}

      {modalType === "view" && (
        <ViewEventsModal
          selectedDate={calendarState.selectedDate}
          onClose={handleCloseModal}
          onEdit={handleEditEvent}
        />
      )}

      {modalType === "goto" && (
        <GoToDateModal
          currentDate={calendarState.selectedDate}
          onClose={handleCloseModal}
          onGo={handleGoToDate}
        />
      )}

      {/* Quit hint */}
      <box style={{ position: "absolute", bottom: 0, right: 1 }}>
        <text fg={THEME.foregroundDim}>Q to quit</text>
      </box>
    </box>
  )
}
