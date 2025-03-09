
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchReminderById, updateReminder, deleteReminder } from "@/lib/api";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, Pill, Calendar, Clock, Trash2, AlertCircle, Volume, Edit } from "lucide-react";
import { useState } from "react";
import EditReminderDialog from "@/components/EditReminderDialog";
import { speakReminder, createReminderVoiceText } from "@/lib/voiceService";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";

export default function ReminderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const { data: reminder, isLoading, isError, refetch } = useQuery({
    queryKey: ["reminder", id],
    queryFn: () => fetchReminderById(id!),
    retry: false,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteReminder(id!),
    onSuccess: () => {
      toast.success("Reminder deleted");
      navigate("/reminders");
    },
    onError: () => {
      toast.error("Failed to delete the reminder. Please try again.");
    },
  });

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate();
    setIsDeleteDialogOpen(false);
  };

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handlePlayVoice = async () => {
    if (!reminder || isPlaying) return;
    
    setIsPlaying(true);
    try {
      const text = createReminderVoiceText(reminder.medicineName, reminder.dosage);
      const audio = await speakReminder(text);
      
      if (audio) {
        audio.onended = () => setIsPlaying(false);
      } else {
        setTimeout(() => setIsPlaying(false), 5000);
      }
    } catch (error) {
      console.error("Failed to play voice reminder:", error);
      toast.error("Failed to play voice reminder");
      setIsPlaying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading reminder details...</p>
      </div>
    );
  }

  if (isError || !reminder) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Reminder Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The reminder you're looking for doesn't exist or has been deleted
        </p>
        <Button onClick={() => navigate("/reminders")}>
          Go to Reminders
        </Button>
      </div>
    );
  }

  const nextDue = new Date(reminder.nextDue);

  return (
    <div className="min-h-screen pt-16 pb-6 px-4">
      <Header title="Reminder Details" showBackButton />
      
      <div className="container max-w-md mx-auto space-y-6 animate-fade-in">
        <div className="bg-card rounded-xl p-6 border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Pill className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{reminder.medicineName}</h1>
                <p className="text-muted-foreground">{reminder.dosage}</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-full"
                onClick={handlePlayVoice}
                disabled={isPlaying}
              >
                {isPlaying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Volume className="h-4 w-4" />
                )}
              </Button>
              
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-full"
                onClick={handleEdit}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-secondary/50 rounded-lg flex flex-col">
                <span className="text-xs text-muted-foreground mb-1 flex items-center">
                  <Clock className="h-3 w-3 mr-1" /> Frequency
                </span>
                <span className="font-medium">Every {reminder.frequency} hours</span>
              </div>
              
              <div className="p-3 bg-secondary/50 rounded-lg flex flex-col">
                <span className="text-xs text-muted-foreground mb-1 flex items-center">
                  <Calendar className="h-3 w-3 mr-1" /> Duration
                </span>
                <span className="font-medium">{reminder.duration} days</span>
              </div>
            </div>
            
            <div className="p-3 bg-primary/5 rounded-lg">
              <span className="text-xs text-muted-foreground mb-1 block">Next Dose</span>
              <span className="font-medium">{format(nextDue, "PPP")} at {format(nextDue, "h:mm a")}</span>
            </div>
            
            {reminder.notes && (
              <div className="p-3 bg-secondary/50 rounded-lg">
                <span className="text-xs text-muted-foreground mb-1 block">Notes</span>
                <span>{reminder.notes}</span>
              </div>
            )}
          </div>
        </div>
        
        <Button 
          variant="destructive" 
          className="w-full"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Reminder
        </Button>
      </div>
      
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-xl">
          <DialogHeader>
            <DialogTitle>Delete Reminder</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this reminder? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {reminder && (
        <EditReminderDialog
          reminder={reminder}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onReminderUpdated={() => refetch()}
        />
      )}
    </div>
  );
}
