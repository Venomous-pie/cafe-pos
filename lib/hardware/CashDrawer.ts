export interface CashDrawer {
  /** Send the open/kick command to the drawer. */
  open(): Promise<{ success: boolean; error?: string }>;
  /** Query the current drawer state. Not all hardware supports this. */
  getStatus(): Promise<"closed" | "open" | "unknown">;
}
