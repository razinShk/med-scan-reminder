
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Eye, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import ImageUploader from "@/components/ImageUploader";
import ReminderForm from "@/components/ReminderForm";
import { scanPrescription } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";

// Hardcoded API key
const TOGETHER_API_KEY = "a60f1a37ec7f5f5af031531b8609f37efb53c94e7763aeb4f7820e2a434b5ab2";

export default function ScanPrescription() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showTextPreview, setShowTextPreview] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleImageSelect = (file: File) => {
    if (isScanning) return; // Prevent starting a new scan while one is in progress
    setScanError(null);
    setSelectedImage(file);
    // Reset previous extraction
    setExtractedText(null);
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
    setScanError(null);
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
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setScanError(errorMessage);
      toast.error("Failed to scan prescription. Please try again with a clearer image.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleReminderCreated = () => {
    // Invalidate reminders query to force a refetch
    queryClient.invalidateQueries({ queryKey: ["reminders"] });
    navigate("/reminders");
  };

  const handleTryAgain = () => {
    setSelectedImage(null);
    setExtractedText(null);
    setScanError(null);
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

            {scanError && !isScanning && (
              <div className="p-4 border border-destructive/30 bg-destructive/10 rounded-xl space-y-3 text-center">
                <p className="text-muted-foreground">Failed to extract text from the image.</p>
                <Button onClick={handleTryAgain} variant="outline" size="sm">
                  Try Again
                </Button>
                <Button 
                  onClick={() => navigate("/add-reminder")} 
                  variant="outline" 
                  size="sm"
                  className="ml-2"
                >
                  Add Manually
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowTextPreview(true)}
                className="flex items-center gap-1.5"
              >
                <Eye className="h-3.5 w-3.5" />
                View Raw Text
              </Button>
            </div>
            <ReminderForm extractedText={extractedText} onReminderCreated={handleReminderCreated} />
            
            <Dialog open={showTextPreview} onOpenChange={setShowTextPreview}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Extracted Prescription Text</DialogTitle>
                  <DialogDescription>
                    This is the raw text extracted from your prescription image.
                  </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                  <Textarea 
                    value={extractedText} 
                    readOnly 
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>
                <DialogFooter>
                  <Button onClick={() => setShowTextPreview(false)}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}
