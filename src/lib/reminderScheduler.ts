
import { fetchReminders } from "./api";
import { Reminder } from "./types";
import { sendReminderNotification } from "./notificationService";
import { toast } from "sonner";
import { addHours } from "date-fns";
import { updateReminder } from "./api";

// Store for active reminders
let activeReminders: Map<string, NodeJS.Timeout> = new Map();
let isInitialized = false;

// Initialize the reminder scheduler
export async function initReminderScheduler(): Promise<void> {
  if (isInitialized) return;
  
  try {
    // Request notification permission on initialization
    if ("Notification" in window && Notification.permission !== "granted") {
      await Notification.requestPermission();
    }
    
    // Load reminders and schedule them
    await scheduleAllReminders();
    
    // Check for new reminders every minute
    const intervalId = setInterval(scheduleAllReminders, 60 * 1000);
    
    // Store the interval ID for cleanup
    window.addEventListener("beforeunload", () => {
      clearInterval(intervalId);
      // Clear all active timeouts
      activeReminders.forEach(timeoutId => clearTimeout(timeoutId));
      activeReminders.clear();
    });
    
    isInitialized = true;
    console.log("Reminder scheduler initialized");
  } catch (error) {
    console.error("Failed to initialize reminder scheduler:", error);
  }
}

// Schedule all reminders
async function scheduleAllReminders(): Promise<void> {
  try {
    const reminders = await fetchReminders();
    
    // Clear existing timeouts
    activeReminders.forEach(timeoutId => clearTimeout(timeoutId));
    activeReminders.clear();
    
    // Schedule each reminder
    reminders.forEach(scheduleReminder);
  } catch (error) {
    console.error("Failed to schedule reminders:", error);
  }
}

// Schedule an individual reminder
function scheduleReminder(reminder: Reminder): void {
  const now = new Date();
  const nextDue = new Date(reminder.nextDue);
  
  // Skip if the next due time is in the past
  if (nextDue <= now) {
    // Update the next due time for past reminders
    updateNextDueTime(reminder);
    return;
  }
  
  // Calculate time until next due in milliseconds
  const timeUntilDue = nextDue.getTime() - now.getTime();
  
  // Schedule the notification
  const timeoutId = setTimeout(() => {
    // Send notification and voice reminder
    sendReminderNotification(reminder);
    
    // Update next due time and reschedule
    updateNextDueTime(reminder);
  }, timeUntilDue);
  
  // Store the timeout ID
  activeReminders.set(reminder.id, timeoutId);
  
  console.log(`Scheduled reminder for ${reminder.medicineName} at ${nextDue.toLocaleString()}`);
}

// Update the next due time for a reminder
async function updateNextDueTime(reminder: Reminder): Promise<void> {
  try {
    // Calculate the next due time based on frequency
    const nextDue = addHours(new Date(), reminder.frequency);
    
    // Update the reminder in the API
    await updateReminder({
      ...reminder,
      nextDue
    });
    
    // Reschedule the updated reminder
    const updatedReminder = { ...reminder, nextDue };
    scheduleReminder(updatedReminder);
  } catch (error) {
    console.error(`Failed to update next due time for reminder ${reminder.id}:`, error);
  }
}

// Force check reminders now (can be called after adding a new reminder)
export async function checkRemindersNow(): Promise<void> {
  await scheduleAllReminders();
}
