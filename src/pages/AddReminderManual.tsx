
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createReminder } from "@/lib/api";
import Header from "@/components/Header";
import { speakReminder, createReminderVoiceText } from "@/lib/voiceService";
import { type Reminder } from "@/lib/types";
import { addHours } from "date-fns";
import { checkRemindersNow } from "@/lib/reminderScheduler";
import { requestNotificationPermission } from "@/lib/notificationService";

export default function AddReminderManual() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [medicineName, setMedicineName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("24");
  const [duration, setDuration] = useState("7");
  const [notes, setNotes] = useState("");

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!medicineName || !dosage) {
      toast.error("Medicine name and dosage are required");
      return;
    }

    // Request notification permission if we haven't yet
    await requestNotificationPermission();
    
    setIsSubmitting(true);
    
    try {
      const frequencyNum = parseInt(frequency);
      const durationNum = parseInt(duration);
      
      if (isNaN(frequencyNum) || isNaN(durationNum)) {
        throw new Error("Frequency and duration must be valid numbers");
      }
      
      const reminderData: Omit<Reminder, "id"> = {
        medicineName,
        dosage,
        frequency: frequencyNum,
        nextDue: addHours(new Date(), frequencyNum),
        duration: durationNum,
        notes: notes || null,
      };
      
      await createReminder(reminderData);
      toast.success("Reminder created successfully");
      
      // Check for reminders immediately after creating a new one
      await checkRemindersNow();
      
      navigate("/reminders");
    } catch (error) {
      console.error("Error creating reminder:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create reminder");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Test voice reminder
  const testVoiceReminder = () => {
    if (!medicineName || !dosage) {
      toast.error("Enter medicine name and dosage to test voice reminder");
      return;
    }
    
    const voiceText = createReminderVoiceText(medicineName, dosage);
    console.log("Testing voice reminder:", voiceText);
    
    speakReminder(voiceText)
      .then(audio => {
        if (audio) {
          toast.success("Voice reminder test successful");
        }
      })
      .catch(error => {
        console.error("Voice reminder test failed:", error);
        toast.error("Failed to test voice reminder");
      });
  };

  return (
    <div className="min-h-screen pt-16 pb-6 px-4">
      <Header title="Add Reminder" showBackButton />
      
      <div className="container max-w-md mx-auto space-y-6 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-center">Add New Reminder</h1>
          <p className="text-center text-muted-foreground">
            Manually add a medicine reminder
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="medicineName">Medicine Name</Label>
            <Input
              id="medicineName"
              placeholder="e.g., Paracetamol"
              value={medicineName}
              onChange={e => setMedicineName(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dosage">Dosage</Label>
            <Input
              id="dosage"
              placeholder="e.g., 500mg twice daily"
              value={dosage}
              onChange={e => setDosage(e.target.value)}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency (hours)</Label>
              <Input
                id="frequency"
                type="number"
                min="1"
                placeholder="24"
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                placeholder="7"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this medicine..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1" 
              onClick={testVoiceReminder}
            >
              <Clock className="mr-2 h-4 w-4" />
              Test Voice
            </Button>
            
            <Button 
              type="submit" 
              className="flex-1"
              disabled={isSubmitting}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Reminder
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
