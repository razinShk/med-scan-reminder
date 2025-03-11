
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, FileText, RefreshCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import ImageUploader from "@/components/ImageUploader";
import ReminderForm from "@/components/ReminderForm";
import { scanPrescription } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Hardcoded API key
const TOGETHER_API_KEY = "a60f1a37ec7f5f5af031531b8609f37efb53c94e7763aeb4f7820e2a434b5ab2";

// Sample reminder card data for fallback
const SAMPLE_REMINDER_CARDS = `**PREXT (100)**

* **Dosage**: 1-0-1 tablet
* **Duration**: One month

**CLOFRANIL (25)**

* **Dosage**: 1-0-0 tablet
* **Duration**: One month

**CIZODON (MDP-5)**

* **Dosage**: 1-0-0 tablet
* **Duration**: One month`;

export default function ScanPrescription() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showTextPreview, setShowTextPreview] = useState(false);
  const [apiError, setApiError] = useState<boolean>(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleImageSelect = (file: File) => {
    if (isScanning) return; // Prevent starting a new scan while one is in progress
    setSelectedImage(file);
    // Reset previous extraction and error state
    setExtractedText(null);
    setApiError(false);
  };

  // Watch for changes to selectedImage and start scanning
  useEffect(() => {
    if (selectedImage && !isScanning) {
      handleScan(selectedImage);
    }
  }, [selectedImage]);

  const handleScan = async (imageFile: File) => {
    if (!imageFile) {
      toast.error("Please select an image first");
      return;
    }

    setIsScanning(true);
    setApiError(false);
    
    try {
      // Check file size - mobile browsers often have very large image files
      const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
      if (imageFile.size > MAX_FILE_SIZE) {
        toast.info("Optimizing image for processing...");
        // Will be handled by compression in the API layer
      }

      const text = await scanPrescription(imageFile, TOGETHER_API_KEY);
      console.log("Extracted text from prescription:", text);
      
      if (!text) {
        throw new Error("No text could be extracted from the image");
      }
      
      setExtractedText(text);
    } catch (error) {
      console.error("Scan failed:", error);
      
      // Check if it's a 402 error (payment required)
      if (error instanceof Error && error.message.includes("402")) {
        setApiError(true);
        toast.error("API limit reached. Using sample data instead.", {
          duration: 5000,
        });
      } else {
        toast.error("Failed to scan prescription. Please try again with a clearer image.");
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleUseSampleData = () => {
    setExtractedText(SAMPLE_REMINDER_CARDS);
    setApiError(false);
  };

  const handleReminderCreated = () => {
    // Invalidate reminders query to force a refetch
    queryClient.invalidateQueries({ queryKey: ["reminders"] });
    navigate("/reminders");
  };

  return (
    <div className="min-h-screen pt-16 pb-6 px-4">
      <Header title="Scan Prescription" showBackButton />
      
      <div className="container max-w-md mx-auto space-y-6 animate-fade-in">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-center">Scan Prescription</h1>
          <p className="text-center text-muted-foreground">
            Upload a prescription image to automatically extract medicine information
          </p>
        </div>

        {!extractedText ? (
          <div className="space-y-6">
            <ImageUploader onImageSelect={handleImageSelect} />
            
            {isScanning && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Scanning prescription...</p>
              </div>
            )}

            {apiError && (
              <div className="flex flex-col items-center justify-center py-4 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-700 text-sm">
                  <p className="font-medium">API limit reached</p>
                  <p className="mt-1">The scanning service is currently unavailable due to API limits.</p>
                </div>
                <Button 
                  onClick={handleUseSampleData}
                  className="w-full"
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Use Sample Reminder Data
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            <ReminderForm extractedText={extractedText} onReminderCreated={handleReminderCreated} />
            
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4"
              onClick={() => setShowTextPreview(true)}
            >
              <FileText className="h-4 w-4 mr-2" />
              View Raw Text
            </Button>
            
            <Dialog open={showTextPreview} onOpenChange={setShowTextPreview}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Extracted Text</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto mt-4 border rounded-md p-4 bg-muted/20">
                  <pre className="whitespace-pre-wrap text-sm">{extractedText}</pre>
                </div>
                <Button 
                  className="mt-4"
                  onClick={() => setShowTextPreview(false)}
                >
                  Close
                </Button>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}
