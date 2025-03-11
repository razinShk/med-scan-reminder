import { toast } from "sonner";
import { type Reminder } from "./types";
import { processPrescriptionImage } from "./llamaOCR";

// Mock API for storing reminders
const REMINDERS_STORAGE_KEY = "prescription-reminders";

// Helper function to get reminders from local storage
const getReminders = (): Reminder[] => {
  const remindersJson = localStorage.getItem(REMINDERS_STORAGE_KEY);
  return remindersJson ? JSON.parse(remindersJson) : [];
};

// Helper function to save reminders to local storage
const saveReminders = (reminders: Reminder[]) => {
  localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
};

// Create a reminder
export const createReminder = (reminder: Omit<Reminder, "id">): Reminder => {
  const reminders = getReminders();
  const newReminder = {
    ...reminder,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };
  
  reminders.push(newReminder);
  saveReminders(reminders);
  
  return newReminder;
};

// Create multiple reminders
export const createReminders = (remindersData: Omit<Reminder, "id">[]): Reminder[] => {
  const existingReminders = getReminders();
  const newReminders = remindersData.map(reminder => ({
    ...reminder,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  }));
  
  saveReminders([...existingReminders, ...newReminders]);
  
  return newReminders;
};

// Get all reminders
export const fetchReminders = (): Promise<Reminder[]> => {
  return new Promise(resolve => {
    setTimeout(() => {
      const reminders = getReminders();
      resolve(reminders);
    }, 300); // Simulate network delay
  });
};

// Get a reminder by id
export const fetchReminderById = (id: string): Promise<Reminder | undefined> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const reminders = getReminders();
      const reminder = reminders.find(r => r.id === id);
      if (reminder) {
        resolve(reminder);
      } else {
        reject(new Error("Reminder not found"));
      }
    }, 300); // Simulate network delay
  });
};

// Update a reminder
export const updateReminder = (id: string, updates: Partial<Omit<Reminder, "id">>): Promise<Reminder> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const reminders = getReminders();
      const index = reminders.findIndex(r => r.id === id);
      
      if (index !== -1) {
        reminders[index] = { ...reminders[index], ...updates };
        saveReminders(reminders);
        resolve(reminders[index]);
      } else {
        reject(new Error("Reminder not found"));
      }
    }, 300);
  });
};

// Delete a reminder
export const deleteReminder = (id: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const reminders = getReminders();
      const index = reminders.findIndex(r => r.id === id);
      
      if (index !== -1) {
        reminders.splice(index, 1);
        saveReminders(reminders);
        resolve();
      } else {
        reject(new Error("Reminder not found"));
      }
    }, 300);
  });
};

// Delete all reminders
export const deleteAllReminders = (): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      saveReminders([]);
      resolve();
    }, 300); // Simulate network delay
  });
};

// Process prescription image and extract medicine information
export const scanPrescription = async (file: File, apiKey: string) => {
  try {
    const extractedText = await processPrescriptionImage({ file, apiKey });
    
    if (!extractedText) {
      throw new Error("Failed to extract text from prescription");
    }
    
    return extractedText;
  } catch (error) {
    console.error("Failed to scan prescription:", error);
    toast.error("Failed to scan prescription. Please try again.");
    throw error;
  }
};
