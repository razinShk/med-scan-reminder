
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar, Pill, ScanText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchReminders } from "@/lib/api";

const Index = () => {
  const { data: reminders, isLoading } = useQuery({
    queryKey: ["reminders"],
    queryFn: fetchReminders,
  });

  // Add a motion-specific type for framer-motion animations
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300 } },
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md text-center mb-8"
      >
        <div className="inline-block p-4 rounded-full bg-primary/10 mb-6">
          <Pill className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-4">MedScan</h1>
        <p className="text-muted-foreground mb-6">
          Scan your prescriptions and never miss a dose again
        </p>
        
        <div className="mt-2 text-sm">
          {!isLoading && reminders && (
            <p className="text-muted-foreground mb-4">
              {reminders.length === 0
                ? "No reminders yet. Scan a prescription to get started."
                : `${reminders.length} medicine reminder${reminders.length === 1 ? "" : "s"} set up`}
            </p>
          )}
        </div>
      </motion.div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-xs grid gap-4"
      >
        <motion.div variants={item}>
          <Link to="/scan">
            <Button
              variant="default"
              size="lg"
              className="w-full h-16 rounded-xl flex items-center justify-start gap-4 text-lg font-normal shadow-md hover:shadow-lg transition-all"
            >
              <div className="bg-primary/20 rounded-lg p-2">
                <ScanText className="h-6 w-6" />
              </div>
              <div className="text-left">
                <p className="font-medium">Scan Prescription</p>
                <p className="text-xs opacity-80">Extract medicines automatically</p>
              </div>
            </Button>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link to="/reminders">
            <Button
              variant="outline"
              size="lg"
              className="w-full h-16 rounded-xl flex items-center justify-start gap-4 text-lg font-normal shadow-sm hover:shadow-md transition-all"
            >
              <div className="bg-secondary rounded-lg p-2">
                <Calendar className="h-6 w-6" />
              </div>
              <div className="text-left">
                <p className="font-medium">View Reminders</p>
                <p className="text-xs opacity-80">Check your medicine schedule</p>
              </div>
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Index;
