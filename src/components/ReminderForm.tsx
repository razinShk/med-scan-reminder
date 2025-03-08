
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useState } from "react";
import { format, addHours } from "date-fns";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createReminders } from "@/lib/api";
import { z } from "zod";

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

      await createReminders(reminderInputs);
      
      toast.success("Reminders created successfully");
      navigate("/reminders");
    } catch (error) {
      console.error('Error creating reminders:', error);
      toast.error(error instanceof Error ? error.message : "Failed to create reminders. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-md mx-auto">
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-center">Extracted Medicines</h2>
        {medicines.length === 0 && (
          <p className="text-center text-muted-foreground">No medicines found in the prescription</p>
        )}
        {medicines.map((medicine, index) => (
          <div key={index} className="p-4 bg-card rounded-xl shadow-sm border border-border animate-scale-in" style={{ animationDelay: `${index * 100}ms` }}>
            <p className="font-medium">{medicine.name}</p>
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

      <Button 
        onClick={createRemindersHandler} 
        disabled={isSubmitting || medicines.length === 0}
        className="w-full rounded-xl animate-fade-in transition-all duration-300 shadow-md hover:shadow-lg"
        style={{ animationDelay: '500ms' }}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Reminders
          </>
        ) : (
          "Create Reminders"
        )}
      </Button>
    </div>
  );
}
