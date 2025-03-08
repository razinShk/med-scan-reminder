
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import ImageUploader from "@/components/ImageUploader";
import ReminderForm from "@/components/ReminderForm";
import { scanPrescription } from "@/lib/api";

export default function ScanPrescription() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const navigate = useNavigate();

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    // Reset previous extraction
    setExtractedText(null);
  };

  const handleScan = async () => {
    if (!selectedImage) {
      toast.error("Please select an image first");
      return;
    }

    if (!apiKey) {
      toast.error("Please enter your Together API key");
      return;
    }

    setIsScanning(true);
    try {
      const text = await scanPrescription(selectedImage, apiKey);
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
            
            <div className="space-y-3 animate-fade-in">
              <div className="space-y-2">
                <Label htmlFor="api-key">Together API Key</Label>
                <Input
                  id="api-key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Together API key"
                  type="password"
                  className="rounded-lg"
                />
                <p className="text-xs text-muted-foreground">
                  You can get an API key from <a href="https://together.ai" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">together.ai</a>
                </p>
              </div>
              
              <Button
                onClick={handleScan}
                disabled={!selectedImage || !apiKey || isScanning}
                className="w-full rounded-xl"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  "Scan Prescription"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <ReminderForm extractedText={extractedText} />
        )}
      </div>
    </div>
  );
}
