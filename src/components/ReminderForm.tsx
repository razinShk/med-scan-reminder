
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
import { useQueryClient } from "@tanstack/react-query";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Reminder } from "@/lib/types";

const reminderSchema = z.object({
  medicineName: z.string().min(1, "Medicine name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.number().min(1, "Frequency must be at least 1 hour"),
  nextDue: z.date(),
  duration: z.number().min(1, "Duration must be at least 1 day"),
  notes: z.string().nullable(),
});

type ReminderInput = z.infer<typeof reminderSchema>;

interface MedicineDetails {
  name: string;
  dosage: string;
  frequency: string;
  duration: number;
  notes?: string;
}

function extractMedicineDetails(text: string): MedicineDetails[] {
  const medicines: MedicineDetails[] = [];
  
  // Try to extract medicines using different formats
  
  // Format 1: The format with "* **TAB. MEDICINE_NAME**" and indented dosage/duration with +
  const format1Regex = /\*\s+\*\*([^*]+?)\*\*\s*[\r\n]\s*\+\s+Dosage:\s*([^\r\n]+)[\r\n]\s*\+\s+Duration:\s*([^\r\n]+)/gi;
  
  // Format 2: Original format with **MEDICINE_NAME** and * **Dosage**
  const format2Regex = /\*\*([^*]+?)\*\*(?:\s*\(([^)]+)\))?\s*\n\s*\*\s*\*\*Dosage\*\*:\s*([^\n]+)\n\s*\*\s*\*\*Duration\*\*:\s*([^\n]+)/gi;
  
  let match;
  const fullText = text;
  
  // Try Format 1 first (new format)
  while ((match = format1Regex.exec(fullText)) !== null) {
    const medicineName = match[1].trim();
    const dosage = match[2].trim();
    const durationText = match[3].trim();
    
    let duration = 7; // Default duration
    
    // Parse duration text - now looking for formats like "8 Days (Tot: 8 Tab)"
    const daysMatch = durationText.match(/(\d+)\s*Days?/i);
    const monthMatch = durationText.toLowerCase().includes('month');
    const weeksMatch = durationText.match(/(\d+)\s*weeks?/i);
    
    if (daysMatch) {
      duration = parseInt(daysMatch[1]);
    } else if (monthMatch) {
      duration = 30;
    } else if (weeksMatch) {
      duration = parseInt(weeksMatch[1]) * 7;
    }
    
    // Determine frequency based on dosage pattern
    let frequency = "once daily";
    
    // Check for patterns like "1-0-1"
    const dosagePattern = dosage.match(/(\d+)-(\d+)-(\d+)/);
    
    if (dosagePattern) {
      const morning = parseInt(dosagePattern[1]) > 0;
      const afternoon = parseInt(dosagePattern[2]) > 0;
      const night = parseInt(dosagePattern[3]) > 0;
      
      const timesPerDay = [morning, afternoon, night].filter(Boolean).length;
      
      if (timesPerDay === 3) {
        frequency = "thrice daily";
      } else if (timesPerDay === 2) {
        frequency = "twice daily";
      } else {
        frequency = "once daily";
      }
    } 
    // Check for patterns like "1 Morning" or "1 Morning, 1 Night"
    else if (dosage.toLowerCase().includes('morning') && dosage.toLowerCase().includes('night')) {
      frequency = "twice daily";
    } else if (dosage.toLowerCase().includes('morning')) {
      frequency = "once daily"; // Morning only
    } else if (dosage.toLowerCase().includes('night') || dosage.toLowerCase().includes('evening')) {
      frequency = "once daily"; // Night only
    }
    
    medicines.push({
      name: medicineName,
      dosage: dosage,
      frequency: frequency,
      duration: duration,
      notes: durationText // Store full duration text in notes for reference
    });
  }
  
  // Try Format 2 if no medicines found with Format 1
  if (medicines.length === 0) {
    while ((match = format2Regex.exec(fullText)) !== null) {
      const medicineName = match[1].trim();
      const strength = match[2] ? ` (${match[2].trim()})` : '';
      const dosage = match[3].trim();
      const durationText = match[4].trim();
      
      let duration = 7; // Default duration
      
      // Parse duration text
      if (durationText.toLowerCase().includes('month')) {
        duration = 30;
      } else if (durationText.toLowerCase().includes('week')) {
        const weekMatch = durationText.match(/(\d+)\s*weeks?/i);
        duration = weekMatch ? parseInt(weekMatch[1]) * 7 : 7;
      } else if (durationText.toLowerCase().includes('day')) {
        const dayMatch = durationText.match(/(\d+)\s*days?/i);
        duration = dayMatch ? parseInt(dayMatch[1]) : 7;
      } else if (durationText.toLowerCase().includes('one month')) {
        duration = 30;
      }
      
      // Determine frequency from dosage pattern
      let frequency = "once daily";
      const dosagePattern = dosage.match(/(\d+)-(\d+)-(\d+)/);
      
      if (dosagePattern) {
        const morning = parseInt(dosagePattern[1]) > 0;
        const afternoon = parseInt(dosagePattern[2]) > 0;
        const night = parseInt(dosagePattern[3]) > 0;
        
        const timesPerDay = [morning, afternoon, night].filter(Boolean).length;
        
        if (timesPerDay === 3) {
          frequency = "thrice daily";
        } else if (timesPerDay === 2) {
          frequency = "twice daily";
        } else {
          frequency = "once daily";
        }
      }
      
      medicines.push({
        name: medicineName + strength,
        dosage: dosage,
        frequency: frequency,
        duration: duration,
        notes: ''
      });
    }
  }
  
  // If no matches found with either format, try to parse table or other formats (from original code)
  if (medicines.length === 0) {
    const lines: string[] = text.split("\n");
    
    const headerPatterns: RegExp[] = [
      /^\s*\|[\s-]*\|/, 
      /\|\s*Medicine\s*Name\s*\|/i, 
      /\|\s*Dosage\s*\|/i, 
      /\|\s*Duration\s*\|/i, 
      /\|\s*Notes?\s*\|/i
    ];

    // Try to find table-style data or other formats
    for (const line of lines) {
      if (!line.trim() || headerPatterns.some(pattern => pattern.test(line))) {
        continue;
      }

      if (line.includes("|")) {
        const parts = line.split("|").map(part => part.trim());

        const medNamePattern = /(?:^\d+\)?\s*)?(?:med\s+)?(?:TAB\.|Tab\.|CAP\.|Cap\.|SUSPENSION|Suspension|DROP|Drop)\.?\s+([^|(]+)(?:\s*\(([^)]+)\))?/i;
        const numberedPattern = /^\d+\)\s*(?:TAB\.|CAP\.|SUSPENSION|DROP)\.\s+([^|(]+)(?:\s*\(([^)]+)\))?/i;

        const medInfo = parts[0].toLowerCase().includes('med') || /tab\.|cap\.|suspension|drop/i.test(parts[0]) 
          ? parts[0] 
          : parts[1];

        const nameMatch = medInfo.match(medNamePattern) || medInfo.match(numberedPattern);

        if (nameMatch) {
          const medicineName = nameMatch[1].trim();
          const composition = nameMatch[2] ? ` (${nameMatch[2]})` : '';
          const fullName = `${medicineName}${composition}`;

          const dosageInfo = parts.find(part => 
            /Morning|Night|Daily|Hourly|units|ml|-/i.test(part)
          ) || "1 unit daily";

          let frequency = "once daily";
          if (dosageInfo.toLowerCase().includes("morning") && dosageInfo.toLowerCase().includes("night")) {
            frequency = "twice daily";
          } else if (dosageInfo.match(/(\d+)\s*hourly/i)) {
            const hours = dosageInfo.match(/(\d+)\s*hourly/i)?.[1];
            frequency = hours ? `every ${hours} hours` : "once daily";
          }

          let duration = 7;
          const durationMatch = parts.find(part => /days?|weeks?|month/i.test(part));
          if (durationMatch) {
            const daysMatch = durationMatch.match(/(\d+)\s*days?/i);
            const weeksMatch = durationMatch.match(/(\d+)\s*weeks?/i);
            const monthMatch = durationMatch.match(/(\d+)\s*month/i) || durationMatch.match(/one\s*month/i);
            
            if (daysMatch) {
              duration = parseInt(daysMatch[1]);
            } else if (weeksMatch) {
              duration = parseInt(weeksMatch[1]) * 7;
            } else if (monthMatch) {
              duration = 30;
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
  }

  return medicines;
}

type ReminderFormProps = {
  extractedText: string;
  onReminderCreated?: () => void;
};

export default function ReminderForm({ extractedText, onReminderCreated }: ReminderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const [autoCreateComplete, setAutoCreateComplete] = useState(false);
  const createRemindersRef = useRef<boolean>(false);
  const queryClient = useQueryClient();
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
        return 24;
    }
  };

  const createRemindersHandler = async () => {
    if (createRemindersRef.current) return;
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

      console.log("Creating reminders with data:", reminderInputs);

      await createReminders(reminderInputs);
      
      toast.success("Reminders created successfully");
      
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      
      if (onReminderCreated) {
        onReminderCreated();
      } else {
        navigate("/reminders");
      }
    } catch (error) {
      console.error('Error creating reminders:', error);
      toast.error(error instanceof Error ? error.message : "Failed to create reminders. Please try again.");
      createRemindersRef.current = false;
    } finally {
      setIsSubmitting(false);
      setAutoCreateComplete(true);
    }
  };

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
