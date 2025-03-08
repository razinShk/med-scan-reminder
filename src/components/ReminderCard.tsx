
import { cn } from "@/lib/utils";
import { format, differenceInHours, differenceInMinutes, isBefore } from "date-fns";
import { Bell, Pill, Clock, CalendarDays, Trash2, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { deleteReminder } from "@/lib/api";
import { type Reminder } from "@/lib/types";

interface ReminderCardProps {
  reminder: Reminder;
  onDelete?: () => void;
}

export default function ReminderCard({ reminder, onDelete }: ReminderCardProps) {
  const navigate = useNavigate();
  const nextDue = new Date(reminder.nextDue);
  const isOverdue = isBefore(nextDue, new Date());
  
  const getDueText = () => {
    const now = new Date();
    const hoursDiff = differenceInHours(nextDue, now);
    const minutesDiff = differenceInMinutes(nextDue, now);
    
    if (isOverdue) {
      return minutesDiff > -60 
        ? `Overdue by ${Math.abs(minutesDiff)} minutes` 
        : `Overdue by ${Math.abs(hoursDiff)} hours`;
    }
    
    return hoursDiff < 1 
      ? `Due in ${minutesDiff} minutes` 
      : `Due in ${hoursDiff} hours`;
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteReminder(reminder.id);
      toast.success("Reminder deleted successfully");
      if (onDelete) onDelete();
    } catch (error) {
      toast.error("Failed to delete reminder");
    }
  };
  
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/reminder/${reminder.id}`);
  };

  return (
    <div 
      className={cn(
        "relative p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer animate-scale-in group",
        isOverdue && "border-destructive/20 bg-destructive/5"
      )}
      onClick={() => navigate(`/reminder/${reminder.id}`)}
    >
      <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-1">
        <button 
          onClick={handleEdit}
          className="bg-secondary hover:bg-secondary/80 rounded-full p-2 shadow-sm transition-all"
        >
          <Edit className="h-3.5 w-3.5" />
        </button>
        <button 
          onClick={handleDelete}
          className="bg-destructive/10 hover:bg-destructive/20 text-destructive rounded-full p-2 shadow-sm transition-all"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg",
          isOverdue ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
        )}>
          <Pill className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{reminder.medicineName}</h3>
          <p className="text-sm text-muted-foreground">{reminder.dosage}</p>
          
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <div className="flex items-center text-muted-foreground">
              <Clock className="h-3.5 w-3.5 mr-1" />
              <span>Every {reminder.frequency} hours</span>
            </div>
            
            <div className="flex items-center text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 mr-1" />
              <span>{reminder.duration} days</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className={cn(
        "mt-3 text-xs flex items-center pt-3 border-t",
        isOverdue ? "border-destructive/20 text-destructive" : "border-border text-muted-foreground"
      )}>
        <Bell className={cn(
          "h-3.5 w-3.5 mr-1",
          isOverdue && "animate-pulse-slow"
        )} />
        <span>
          {getDueText()} ({format(nextDue, "MMM d, h:mm a")})
        </span>
      </div>
    </div>
  );
}
