
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { format, addHours } from "date-fns";
import { Loader2, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createReminders } from "@/lib/api";
import { z } from "zod";
import EditReminderDialog from "@/components/EditReminderDialog";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Reminder } from "@/lib/types";

// Define the schema for a reminder
const reminderSchema = z.object({
  medicineName: z.string().min(1, "Medicine name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.number().min(1, "Frequency must be at least 1 hour"),
  nextDue: z.date(),
  duration: z.number().min(1, "Duration must be at least 1 day"),
  notes: z.string().nullable(),
});

// Define the type for reminder input
type ReminderInput = z.infer<typeof reminderSchema>;

// Define the type for medicine details
interface MedicineDetails {
  name: string;
  dosage: string;
  frequency: string;
  duration: number;
  notes?: string;
}

// Function to extract medicine details from text
function extractMedicineDetails(text: string): MedicineDetails[] {
  const medicines: MedicineDetails[] = [];
  const lines: string[] = text.split("\n");

  // Simplified header detection
  const headerPatterns: RegExp[] = [
    /^\s*\|[\s-]*\|/,  // Table separator lines
    /\|\s*Medicine\s*Name\s*\|/i,  // Medicine Name header
    /\|\s*Dosage\s*\|/i,  // Dosage header
    /\|\s*Duration\s*\|/i,  // Duration header
    /\|\s*Notes?\s*\|/i  // Notes header
  ];

  for (const line of lines) {
    if (!line.trim() || headerPatterns.some(pattern => pattern.test(line))) {
      continue;
    }

    if (line.includes("|")) {
      const parts = line.split("|").map(part => part.trim());

      // Enhanced medicine name pattern matching
      const medNamePattern = /(?:^\d+\)?\s*)?(?:med\s+)?(?:TAB\.|Tab\.|CAP\.|Cap\.|SUSPENSION|Suspension|DROP|Drop)\.?\s+([^|(]+)(?:\s*\(([^)]+)\))?/i;
      const numberedPattern = /^\d+\)\s*(?:TAB\.|CAP\.|SUSPENSION|DROP)\.\s+([^|(]+)(?:\s*\(([^)]+)\))?/i;

      // Look for medicine info in the first two columns
      const medInfo = parts[0].toLowerCase().includes('med') || /tab\.|cap\.|suspension|drop/i.test(parts[0]) 
        ? parts[0] 
        : parts[1];

      const nameMatch = medInfo.match(medNamePattern) || medInfo.match(numberedPattern);

      if (nameMatch) {
        const medicineName = nameMatch[1].trim();
        const composition = nameMatch[2] ? ` (${nameMatch[2]})` : '';
        const fullName = `${medicineName}${composition}`;

        // Get dosage info
        const dosageInfo = parts.find(part => 
          /Morning|Night|Daily|Hourly|units|ml|-/i.test(part)
        ) || "1 unit daily";

        // Extract frequency
        let frequency = "once daily";
        if (dosageInfo.toLowerCase().includes("morning") && dosageInfo.toLowerCase().includes("night")) {
          frequency = "twice daily";
        } else if (dosageInfo.match(/(\d+)\s*hourly/i)) {
          const hours = dosageInfo.match(/(\d+)\s*hourly/i)?.[1];
          frequency = hours ? `every ${hours} hours` : "once daily";
        }

        // Extract duration
        let duration = 7; // Default duration of 7 days
        const durationMatch = parts.find(part => /days?|weeks?/i.test(part));
        if (durationMatch) {
          const daysMatch = durationMatch.match(/(\d+)\s*days?/i);
          const weeksMatch = durationMatch.match(/(\d+)\s*weeks?/i);
          if (daysMatch) {
            duration = parseInt(daysMatch[1]);
          } else if (weeksMatch) {
            duration = parseInt(weeksMatch[1]) * 7;
          }
        }

        medicines.push({
          name: fullName,
          dosage: dosageInfo,
          frequency,
          duration,
          notes: ''
        });
      }
    }
  }

  return medicines;
}

export default function ReminderForm({ extractedText }: { extractedText: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const [autoCreateComplete, setAutoCreateComplete] = useState(false);
  const createRemindersRef = useRef<boolean>(false);
  const [editingMedicine, setEditingMedicine] = useState<{
    index: number;
    details: MedicineDetails;
    reminderInput: ReminderInput;
  } | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const medicines = extractMedicineDetails(extractedText);

  const getFrequencyHours = (frequency: string): number => {
    const hourlyMatch = frequency.match(/every\s+(\d+)\s+hours/);
    if (hourlyMatch) {
      return parseInt(hourlyMatch[1]);
    }

    switch (frequency.toLowerCase()) {
      case 'twice daily':
        return 12;
      case 'thrice daily':
        return 8;
      default:
        return 24; // Default to once daily
    }
  };

  const createRemindersHandler = async () => {
    if (createRemindersRef.current) return; // Prevent multiple submissions
    createRemindersRef.current = true;
    
    setIsSubmitting(true);
    try {
      const reminderInputs = medicines.map(medicine => {
        const frequencyHours = getFrequencyHours(medicine.frequency);
        const nextDue = addHours(new Date(), frequencyHours);

        return {
          medicineName: medicine.name,
          dosage: medicine.dosage,
          frequency: frequencyHours,
          nextDue: nextDue,
          duration: medicine.duration,
          notes: medicine.notes || null
        };
      });

      // Log before creating reminders
      console.log("Creating reminders with data:", reminderInputs);

      await createReminders(reminderInputs);
      
      toast.success("Reminders created successfully");
      navigate("/reminders");
    } catch (error) {
      console.error('Error creating reminders:', error);
      toast.error(error instanceof Error ? error.message : "Failed to create reminders. Please try again.");
      createRemindersRef.current = false; // Reset to allow retry
    } finally {
      setIsSubmitting(false);
      setAutoCreateComplete(true);
    }
  };

  // Handle medicine edit
  const handleEditMedicine = (index: number) => {
    const medicine = medicines[index];
    const frequencyHours = getFrequencyHours(medicine.frequency);
    const nextDue = addHours(new Date(), frequencyHours);
    
    setEditingMedicine({
      index,
      details: medicine,
      reminderInput: {
        medicineName: medicine.name,
        dosage: medicine.dosage,
        frequency: frequencyHours,
        nextDue,
        duration: medicine.duration,
        notes: medicine.notes || null
      }
    });
    
    setIsEditDialogOpen(true);
  };

  // Auto-create reminders when component mounts
  useEffect(() => {
    if (medicines.length > 0 && !autoCreateComplete && !createRemindersRef.current) {
      createRemindersHandler();
    }
  }, [medicines, autoCreateComplete]);

  return (
    <div className="space-y-6 w-full max-w-md mx-auto">
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-center">Extracted Medicines</h2>
        {medicines.length === 0 && (
          <p className="text-center text-muted-foreground">No medicines found in the prescription</p>
        )}
        {medicines.map((medicine, index) => (
          <div key={index} className="p-4 bg-card rounded-xl shadow-sm border border-border animate-scale-in relative" style={{ animationDelay: `${index * 100}ms` }}>
            <button 
              className="absolute top-2 right-2 p-1 bg-secondary/50 rounded-full hover:bg-secondary/70 transition-colors"
              onClick={() => handleEditMedicine(index)}
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
            
            <p className="font-medium pr-7">{medicine.name}</p>
            <div className="mt-2 space-y-1">
              <p className="text-sm text-muted-foreground flex justify-between">
                <span>Dosage:</span> <span>{medicine.dosage}</span>
              </p>
              <p className="text-sm text-muted-foreground flex justify-between">
                <span>Frequency:</span> <span>{medicine.frequency}</span>
              </p>
              <p className="text-sm text-muted-foreground flex justify-between">
                <span>Duration:</span> <span>{medicine.duration} days</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {isSubmitting && (
        <div className="flex flex-col items-center justify-center py-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Creating reminders automatically...</p>
        </div>
      )}

      {!isSubmitting && medicines.length > 0 && autoCreateComplete && (
        <Button 
          onClick={() => navigate("/reminders")}
          className="w-full rounded-xl animate-fade-in transition-all duration-300 shadow-md hover:shadow-lg"
        >
          View Reminders
        </Button>
      )}
      
      {/* Edit Dialog for medicine details */}
      {editingMedicine && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px] rounded-xl">
            <EditReminderDialog
              reminder={{
                id: `temp-${editingMedicine.index}`,
                medicineName: editingMedicine.reminderInput.medicineName,
                dosage: editingMedicine.reminderInput.dosage,
                frequency: editingMedicine.reminderInput.frequency,
                nextDue: editingMedicine.reminderInput.nextDue,
                duration: editingMedicine.reminderInput.duration,
                notes: editingMedicine.reminderInput.notes,
                createdAt: new Date()
              }}
              open={isEditDialogOpen}
              onOpenChange={setIsEditDialogOpen}
              onReminderUpdated={() => {
                // This is just pre-creation editing, so we'll just close the dialog
                setIsEditDialogOpen(false);
                setEditingMedicine(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
