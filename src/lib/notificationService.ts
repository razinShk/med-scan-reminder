
import { toast } from "sonner";
import { createReminderVoiceText, speakReminder } from "./voiceService";
import { Reminder } from "./types";

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    toast.error("This browser does not support notifications");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch (error) {
    console.error("Error requesting notification permission:", error);
    toast.error("Failed to get notification permission");
    return false;
  }
}

// Send a browser notification for a reminder
export function sendReminderNotification(reminder: Reminder): void {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    // Fall back to toast if notifications aren't available/permitted
    toast.info(`Time to take ${reminder.medicineName}`, {
      description: reminder.dosage
    });
    return;
  }

  try {
    const notification = new Notification("Medicine Reminder", {
      body: `Time to take ${reminder.medicineName}, ${reminder.dosage}`,
      icon: "/favicon.ico",
      tag: `reminder-${reminder.id}`, // Prevent duplicate notifications for same reminder
      requireInteraction: true // Keep notification until user interacts with it
    });

    // Play voice reminder when notification is shown
    notification.addEventListener("show", () => {
      playVoiceReminder(reminder);
    });

    // Handle notification click
    notification.addEventListener("click", () => {
      // Focus on window and close notification when clicked
      window.focus();
      notification.close();
      
      // Navigate to reminder detail when notification is clicked
      // Only if the app is running
      if (window.location.pathname !== `/reminder/${reminder.id}`) {
        window.location.href = `/reminder/${reminder.id}`;
      }
    });
  } catch (error) {
    console.error("Error showing notification:", error);
    // Fall back to toast
    toast.info(`Time to take ${reminder.medicineName}`, {
      description: reminder.dosage
    });
  }
}

// Play voice reminder for a specific reminder
export async function playVoiceReminder(reminder: Reminder): Promise<void> {
  try {
    const text = createReminderVoiceText(reminder.medicineName, reminder.dosage);
    await speakReminder(text);
  } catch (error) {
    console.error("Failed to play voice reminder:", error);
  }
}
