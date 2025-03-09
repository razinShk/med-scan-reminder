
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, CalendarIcon, Clock } from "lucide-react";
import { toast } from "sonner";
import { Reminder } from "@/lib/types";
import { updateReminder } from "@/lib/api";
import { cn } from "@/lib/utils";

const reminderSchema = z.object({
  medicineName: z.string().min(1, "Medicine name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.coerce.number().min(1, "Frequency must be at least 1 hour"),
  duration: z.coerce.number().min(1, "Duration must be at least 1 day"),
  notes: z.string().nullable().optional(),
  nextDue: z.date({
    required_error: "Please select a date and time",
  }),
});

type ReminderFormValues = z.infer<typeof reminderSchema>;

interface EditReminderDialogProps {
  reminder: Reminder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReminderUpdated: () => void;
}

export default function EditReminderDialog({ 
  reminder, 
  open, 
  onOpenChange,
  onReminderUpdated 
}: EditReminderDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      medicineName: reminder.medicineName,
      dosage: reminder.dosage,
      frequency: reminder.frequency,
      duration: reminder.duration,
      notes: reminder.notes || "",
      nextDue: new Date(reminder.nextDue),
    },
  });

  async function onSubmit(data: ReminderFormValues) {
    setIsSubmitting(true);
    try {
      await updateReminder(reminder.id, {
        ...data,
        nextDue: data.nextDue,
      });
      
      toast.success("Reminder updated successfully");
      onReminderUpdated();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update reminder: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  // Get hours and minutes separately for the time input
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeString = e.target.value;
    if (!timeString) return;

    const nextDue = new Date(form.getValues("nextDue"));
    const [hours, minutes] = timeString.split(':').map(Number);
    
    nextDue.setHours(hours || 0);
    nextDue.setMinutes(minutes || 0);
    
    form.setValue("nextDue", nextDue, { shouldValidate: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-xl">
        <DialogHeader>
          <DialogTitle>Edit Reminder</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="medicineName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medicine Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="dosage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dosage</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency (hours)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} step={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (days)</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} step={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="nextDue"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Next Due Date</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "pl-3 text-left font-normal flex justify-between items-center",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <div className="flex items-center relative">
                      <Clock className="absolute left-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="time"
                        className="pl-10"
                        value={format(field.value, "HH:mm")}
                        onChange={handleTimeChange}
                      />
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      value={field.value || ""}
                      placeholder="Add any additional notes here"
                      className="resize-none h-20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : "Update Reminder"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
