export function printHelp(): void {
	console.log(`cronos

Usage:
  cronos                       Launch the TUI
  cronos list [--date YYYY-MM-DD] [--from YYYY-MM-DD] [--to YYYY-MM-DD]
  cronos next
  cronos add --date YYYY-MM-DD <title and time>
  cronos delete --id <event-id>

Examples:
  cronos list --date 2025-04-10
  cronos next
  cronos add --date 2025-04-10 "Lunch 12pm-1pm #green"
  cronos delete --id event-12-1713456789
`);
}
