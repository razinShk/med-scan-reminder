
import { fetchReminders, updateReminder } from "./api";
import { type Reminder } from "./types";
import { sendReminderNotification } from "./notificationService";

// Function to schedule the next check for reminders
export const scheduleNextCheck = () => {
  // Calculate the time until the next minute
  const now = new Date();
  const seconds = now.getSeconds();
  const milliseconds = now.getMilliseconds();
  const timeToNextMinute = (60 - seconds) * 1000 - milliseconds;

  // Schedule the next check at the start of the next minute
  setTimeout(checkRemindersNow, timeToNextMinute);
  console.log(`Next check scheduled in ${timeToNextMinute / 1000} seconds`);
};

export const checkRemindersNow = async () => {
  try {
    const reminders = await fetchReminders();
    const now = new Date();
    
    console.log(`Checking ${reminders.length} reminders at ${now.toLocaleTimeString()}`);
    
    let remindersUpdated = false;
    
    for (const reminder of reminders) {
      const nextDue = new Date(reminder.nextDue);
      
      // Check if this reminder is due now or in the past
      if (nextDue <= now) {
        // Trigger notification
        await triggerReminderNotification(reminder);
        
        // Update the next due time based on frequency (in hours)
        // Add the frequency in hours to the current time, not the past due time
        const newNextDue = new Date();
        newNextDue.setHours(newNextDue.getHours() + reminder.frequency);
        
        // Update the reminder
        await updateReminder(reminder.id, { nextDue: newNextDue });
        remindersUpdated = true;
        
        console.log(`Reminder for ${reminder.medicineName} triggered and updated to next due at ${newNextDue.toLocaleString()}`);
      }
    }
    
    // If we updated any reminders, schedule the next check
    if (remindersUpdated) {
      scheduleNextCheck();
    }
    
    return remindersUpdated;
  } catch (error) {
    console.error("Error checking reminders:", error);
    return false;
  }
};

// Function to trigger a reminder notification
async function triggerReminderNotification(reminder: Reminder, force = false) {
  try {
    // Use the correct function from notificationService
    sendReminderNotification(reminder);
  } catch (error) {
    console.error("Failed to show notification:", error);
  }
}

// Initialize the reminder scheduler
export const initReminderScheduler = () => {
  console.log("Reminder scheduler initialized");
  scheduleNextCheck();
};
