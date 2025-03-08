
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import ImageUploader from "@/components/ImageUploader";
import ReminderForm from "@/components/ReminderForm";
import { scanPrescription } from "@/lib/api";

// Hardcoded API key
const TOGETHER_API_KEY = "a60f1a37ec7f5f5af031531b8609f37efb53c94e7763aeb4f7820e2a434b5ab2";

export default function ScanPrescription() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const navigate = useNavigate();

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    // Reset previous extraction
    setExtractedText(null);
  };

  // Watch for changes to selectedImage and start scanning
  useEffect(() => {
    if (selectedImage) {
      handleScan(selectedImage);
    }
  }, [selectedImage]);

  const handleScan = async (imageFile: File) => {
    if (!imageFile) {
      toast.error("Please select an image first");
      return;
    }

    setIsScanning(true);
    try {
      const text = await scanPrescription(imageFile, TOGETHER_API_KEY);
      setExtractedText(text);
    } catch (error) {
      console.error("Scan failed:", error);
      toast.error("Failed to scan prescription. Please try again.");
    } finally {
      setIsScanning(false);
    }
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
          </div>
        ) : (
          <ReminderForm extractedText={extractedText} />
        )}
      </div>
    </div>
  );
}
