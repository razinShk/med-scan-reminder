
export interface Reminder {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: number; // in hours
  nextDue: Date;
  duration: number; // in days
  notes: string | null;
  createdAt?: Date;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}
