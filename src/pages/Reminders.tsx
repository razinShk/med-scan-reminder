
import { useQuery } from "@tanstack/react-query";
import { fetchReminders, deleteAllReminders } from "@/lib/api";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { Plus, Pill, CalendarClock, Loader2, PenLine, Trash2 } from "lucide-react";
import ReminderCard from "@/components/ReminderCard";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Reminders() {
  const location = useLocation();
  const { data: reminders, isLoading, refetch } = useQuery({
    queryKey: ["reminders"],
    queryFn: fetchReminders,
  });
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleReminderDelete = () => {
    refetch();
  };

  const handleDeleteAllReminders = async () => {
    setIsDeleting(true);
    try {
      await deleteAllReminders();
      toast.success("All reminders deleted successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to delete reminders");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Refetch reminders when component mounts or when navigating back to this page
  useEffect(() => {
    // Always refetch when the component mounts
    refetch();
    
    // Create a listener to detect when app regains focus
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };
    
    document.addEventListener('visibilitychange', onVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refetch, location]);

  return (
    <div className="min-h-screen pt-16 pb-6 px-4">
      <Header title="My Reminders" showBackButton />
      
      <div className="container max-w-md mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Reminders</h1>
          <div className="flex gap-2">
            <Link to="/add-reminder">
              <Button size="sm" className="rounded-full" variant="outline">
                <PenLine className="h-4 w-4 mr-1" />
                Manual
              </Button>
            </Link>
            <Link to="/scan">
              <Button size="sm" className="rounded-full">
                <Plus className="h-4 w-4 mr-1" />
                Scan
              </Button>
            </Link>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Loading reminders...</p>
          </div>
        ) : reminders && reminders.length > 0 ? (
          <>
            <div className="space-y-4">
              {reminders.map((reminder) => (
                <ReminderCard 
                  key={reminder.id} 
                  reminder={reminder} 
                  onDelete={handleReminderDelete}
                />
              ))}
            </div>
            
            <Button 
              variant="destructive" 
              size="sm" 
              className="w-full mt-6"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All Reminders
            </Button>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete All Reminders</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete all your reminders? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteAllReminders}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete All"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-muted/50 p-3 rounded-full mb-4">
              <CalendarClock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No reminders yet</h3>
            <p className="text-muted-foreground mb-6 max-w-xs">
              Add reminders manually or by scanning a prescription
            </p>
            <div className="flex gap-4">
              <Link to="/add-reminder">
                <Button variant="outline" className="rounded-lg">
                  <PenLine className="h-4 w-4 mr-2" />
                  Add Manually
                </Button>
              </Link>
              <Link to="/scan">
                <Button className="rounded-lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Scan Prescription
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
