export type ColorName = "gray" | "blue" | "green" | "red" | "yellow" | "purple" | "orange"

export interface CalendarEvent {
  id: string
  date: string // YYYY-MM-DD format
  title: string
  startTime?: number // Minutes from midnight (0-1439)
  endTime?: number // Minutes from midnight (0-1439)
  color: ColorName
}

export interface CalendarState {
  displayedMonth: Date // First day of the displayed month
  selectedDate: Date // Currently selected date
}

export type ModalType = "none" | "add" | "view" | "goto"

export interface ModalState {
  type: ModalType
  editingEvent?: CalendarEvent // For edit mode in add modal
}

export interface ParsedEventInput {
  title: string
  startTime?: number
  endTime?: number
  color: ColorName
}
