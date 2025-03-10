
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
  const lines: string[] = text.split("\n");

  // Patterns to identify medicine table headers and ignore them
  const headerPatterns: RegExp[] = [
    /^\s*\|[\s-]*\|/, 
    /\|\s*Medicine\s*Name\s*\|/i, 
    /\|\s*Dosage\s*\|/i, 
    /\|\s*Duration\s*\|/i, 
    /\|\s*Notes?\s*\|/i,
    /^Medicine/i,
    /^Details/i
  ];

  // Log the entire text for debugging
  console.log("Extracted text for medicine parsing:", text);
  
  // First, try to find markdown table format (most common)
  let hasFoundTable = false;
  
  for (const line of lines) {
    if (!line.trim() || headerPatterns.some(pattern => pattern.test(line))) {
      continue;
    }

    if (line.includes("|")) {
      hasFoundTable = true;
      const parts = line.split("|").map(part => part.trim()).filter(Boolean);
      
      console.log("Parsed table row:", parts);
      
      if (parts.length < 2) continue;

      // Try to identify medicine name in the first or second column
      const medicineNameCol = parts[0].match(/^\d+\)/) ? parts[0] : parts[1];
      const medicineName = extractMedicineName(medicineNameCol);
      
      if (!medicineName) continue;
      
      // Find dosage info
      const dosageInfo = parts.find(part => 
        /Morning|Night|Daily|Hourly|units|ml|-|Food|After|Before/i.test(part)
      ) || "1 unit daily";
      
      // Determine frequency
      let frequency = determineDosageFrequency(dosageInfo);
      
      // Find duration
      let duration = extractDuration(parts);
      
      medicines.push({
        name: medicineName,
        dosage: dosageInfo,
        frequency,
        duration,
        notes: ''
      });
    }
  }
  
  // If table format extraction failed, try to find medicine information in other formats
  if (!hasFoundTable || medicines.length === 0) {
    console.log("No table format found or no medicines extracted, trying alternate formats");
    
    // Try to find numbered or bulleted lists of medicines
    const medicineListPatterns = [
      /(\d+\)?\s*)?(?:TAB\.|Tab\.|CAP\.|Cap\.|SUSPENSION|Suspension|DROP|Drop|SYR\.|Syr\.|INJ\.|Inj\.)\s*([^(]+)(?:\s*\(([^)]+)\))?\s*(?:[-:]\s*)?([^|]*)/i,
      /[•*-]\s*(?:TAB\.|Tab\.|CAP\.|Cap\.|SUSPENSION|Suspension|DROP|Drop|SYR\.|Syr\.|INJ\.|Inj\.)\s*([^(]+)(?:\s*\(([^)]+)\))?\s*(?:[-:]\s*)?([^|]*)/i,
      /(?:Medicine|Medication)\s*(?:\d+\)?\s*)?:?\s*([\w\s]+)(?:\s*\(([^)]+)\))?\s*(?:[-:]\s*)?([^|]*)/i
    ];
    
    for (const line of lines) {
      if (!line.trim() || line.trim().length < 5) continue;
      
      // Try each pattern
      for (const pattern of medicineListPatterns) {
        const match = line.match(pattern);
        if (match) {
          console.log("Found medicine with alternate pattern:", match);
          
          let medicineName, composition, dosageInfo;
          
          if (pattern === medicineListPatterns[0] || pattern === medicineListPatterns[1]) {
            medicineName = match[2]?.trim() || match[1]?.trim();
            composition = match[3] ? ` (${match[3]})` : '';
            dosageInfo = match[4]?.trim() || "1 unit daily";
          } else {
            medicineName = match[1]?.trim();
            composition = match[2] ? ` (${match[2]})` : '';
            dosageInfo = match[3]?.trim() || "1 unit daily";
          }
          
          if (!medicineName) continue;
          
          const fullName = `${medicineName}${composition}`;
          const frequency = determineDosageFrequency(dosageInfo);
          const duration = extractDurationFromString(dosageInfo) || 7; // Default 7 days
          
          medicines.push({
            name: fullName,
            dosage: dosageInfo,
            frequency,
            duration,
            notes: ''
          });
          
          break; // We found a match for this line, move to next
        }
      }
    }
  }
  
  // Fallback: If we still couldn't find medicines, look for any mentions of medicine names
  if (medicines.length === 0) {
    console.log("Still no medicines found, trying last resort parsing");
    
    const commonMedicineTypeIndicators = [
      'TAB.', 'Tab.', 'TABLET', 'Tablet', 
      'CAP.', 'Cap.', 'CAPSULE', 'Capsule',
      'SYR.', 'Syr.', 'SYRUP', 'Syrup',
      'INJ.', 'Inj.', 'INJECTION', 'Injection',
      'DROP', 'Drop', 'DROPS', 'Drops',
      'SUSPENSION', 'Suspension'
    ];
    
    for (const line of lines) {
      if (!line.trim() || line.trim().length < 5) continue;
      
      const lineLower = line.toLowerCase();
      
      // Check if this line contains any medicine type indicators
      if (commonMedicineTypeIndicators.some(indicator => 
          lineLower.includes(indicator.toLowerCase()))) {
        
        console.log("Found potential medicine line:", line);
        
        // Basic extraction - get the first part as the name and the rest as dosage
        const parts = line.split(/[-:]/);
        let medicineName = parts[0].trim();
        let dosageInfo = parts.length > 1 ? parts.slice(1).join(' ').trim() : "1 unit daily";
        
        // Clean up medicine name
        for (const indicator of commonMedicineTypeIndicators) {
          if (medicineName.includes(indicator)) {
            // Extract what's after the indicator as the actual name
            const nameParts = medicineName.split(indicator);
            if (nameParts.length > 1) {
              medicineName = indicator + " " + nameParts[1].trim();
              break;
            }
          }
        }
        
        if (medicineName) {
          const frequency = determineDosageFrequency(dosageInfo);
          const duration = extractDurationFromString(dosageInfo) || 7;
          
          medicines.push({
            name: medicineName,
            dosage: dosageInfo || "As directed",
            frequency,
            duration,
            notes: ''
          });
        }
      }
    }
  }
  
  console.log("Final extracted medicines:", medicines);
  return medicines;
}

// Helper functions for medicine extraction
function extractMedicineName(text: string): string | null {
  const medNamePattern = /(?:^\d+\)?\s*)?(?:med\s+)?(?:TAB\.|Tab\.|CAP\.|Cap\.|SUSPENSION|Suspension|DROP|Drop|SYR\.|Syr\.)\.\s*([^|(]+)(?:\s*\(([^)]+)\))?/i;
  const numberedPattern = /^\d+\)\s*(?:TAB\.|CAP\.|SUSPENSION|DROP|SYR\.)\.\s*([^|(]+)(?:\s*\(([^)]+)\))?/i;
  const simpleMedPattern = /([A-Z][A-Za-z\s\d]+)(?:\s*\(([^)]+)\))?/;
  
  // Try the specific patterns first
  const nameMatch = text.match(medNamePattern) || text.match(numberedPattern);
  
  if (nameMatch) {
    const medicineName = nameMatch[1].trim();
    const composition = nameMatch[2] ? ` (${nameMatch[2]})` : '';
    return `${medicineName}${composition}`;
  }
  
  // If specific patterns fail, try a more general approach
  const simpleMatch = text.match(simpleMedPattern);
  if (simpleMatch) {
    const medicineName = simpleMatch[1].trim();
    const composition = simpleMatch[2] ? ` (${simpleMatch[2]})` : '';
    return `${medicineName}${composition}`;
  }
  
  return null;
}

function determineDosageFrequency(dosageInfo: string): string {
  const dosageLower = dosageInfo.toLowerCase();
  
  if (dosageLower.match(/(\d+)\s*hourly/i)) {
    const hours = dosageLower.match(/(\d+)\s*hourly/i)?.[1];
    return hours ? `every ${hours} hours` : "once daily";
  }
  
  // Check for multiple doses per day
  const hasMorning = dosageLower.includes("morning");
  const hasNight = dosageLower.includes("night");
  const hasAfternoon = dosageLower.includes("afternoon") || dosageLower.includes("aft");
  const hasEvening = dosageLower.includes("evening") || dosageLower.includes("eve");
  
  let doseCount = 0;
  if (hasMorning) doseCount++;
  if (hasNight) doseCount++;
  if (hasAfternoon) doseCount++;
  if (hasEvening) doseCount++;
  
  if (doseCount >= 3) return "thrice daily";
  if (doseCount === 2) return "twice daily";
  
  // Check for generic indicators
  if (dosageLower.includes("three times") || dosageLower.includes("3 times")) return "thrice daily";
  if (dosageLower.includes("twice") || dosageLower.includes("two times") || dosageLower.includes("2 times")) return "twice daily";
  
  return "once daily";
}

function extractDuration(parts: string[]): number {
  const durationMatch = parts.find(part => /days?|weeks?/i.test(part));
  if (durationMatch) {
    const daysMatch = durationMatch.match(/(\d+)\s*days?/i);
    const weeksMatch = durationMatch.match(/(\d+)\s*weeks?/i);
    if (daysMatch) {
      return parseInt(daysMatch[1]);
    } else if (weeksMatch) {
      return parseInt(weeksMatch[1]) * 7;
    }
  }
  
  // Try to find a total number of tablets which might indicate duration
  const totMatch = parts.find(part => /tot\s*:\s*(\d+)/i.test(part));
  if (totMatch) {
    const match = totMatch.match(/tot\s*:\s*(\d+)/i);
    if (match) {
      const totalTablets = parseInt(match[1]);
      // If we can determine frequency, calculate duration
      const frequencyPart = parts.find(part => 
        /Morning|Night|Daily|Hourly/i.test(part)
      );
      
      if (frequencyPart) {
        const frequency = determineDosageFrequency(frequencyPart);
        let dailyDoses = 1;
        
        if (frequency === "twice daily") dailyDoses = 2;
        else if (frequency === "thrice daily") dailyDoses = 3;
        
        return Math.ceil(totalTablets / dailyDoses);
      }
    }
  }
  
  return 7; // Default to 7 days if no duration found
}

function extractDurationFromString(text: string): number | null {
  const daysMatch = text.match(/(\d+)\s*days?/i);
  const weeksMatch = text.match(/(\d+)\s*weeks?/i);
  const monthsMatch = text.match(/(\d+)\s*months?/i);
  
  if (daysMatch) {
    return parseInt(daysMatch[1]);
  } else if (weeksMatch) {
    return parseInt(weeksMatch[1]) * 7;
  } else if (monthsMatch) {
    return parseInt(monthsMatch[1]) * 30;
  }
  
  // Try to find total tablets pattern
  const totMatch = text.match(/tot\s*:?\s*(\d+)/i);
  if (totMatch) {
    const totalTablets = parseInt(totMatch[1]);
    // Estimate based on typical daily dosage
    if (text.toLowerCase().includes("twice") || 
        text.match(/(\d+)\s*morning/i) && text.match(/(\d+)\s*night/i)) {
      return Math.ceil(totalTablets / 2);
    }
    
    return totalTablets; // Assume one per day if no frequency info
  }
  
  return null;
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
      if (medicines.length === 0) {
        toast.error("No medicines could be identified in the prescription");
        createRemindersRef.current = false;
        setIsSubmitting(false);
        setAutoCreateComplete(true);
        return;
      }

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
          <div className="text-center p-6 bg-muted/30 rounded-xl border border-dashed border-muted-foreground/50">
            <p className="text-muted-foreground mb-2">No medicines found in the prescription</p>
            <p className="text-sm text-muted-foreground/70">
              Try taking a clearer photo of your prescription or manually add reminders instead.
            </p>
          </div>
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

      {!isSubmitting && medicines.length === 0 && autoCreateComplete && (
        <div className="flex flex-col gap-3">
          <Button 
            onClick={() => navigate("/add-reminder")}
            className="w-full rounded-xl animate-fade-in transition-all duration-300 shadow-md hover:shadow-lg"
            variant="outline"
          >
            Add Reminder Manually
          </Button>
          <Button 
            onClick={() => navigate("/")}
            className="w-full rounded-xl animate-fade-in transition-all duration-300 shadow-md hover:shadow-lg"
          >
            Go Home
          </Button>
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
