
import { toast } from "sonner";

export async function processPrescriptionImage({ file, apiKey }: { file: File; apiKey: string }): Promise<string | null> {
  try {
    if (!apiKey) throw new Error("Missing Together API Key");

    const visionLLM = "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo";
    
    // Convert image file to Base64
    const finalImageUrl = await encodeImage(file);

    // In a real app, we would make an API call to Together AI here
    // For now, we'll just simulate a response for demonstration purposes
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mocked response for demo purposes
    const extractedText = `
# Patient Prescription

| Medicine Name | Dosage | Frequency | Duration | Notes |
|---------------|--------|-----------|----------|-------|
| TAB. Amoxicillin (500mg) | 1 tablet | twice daily | 7 days | Take after meals |
| CAP. Omeprazole (20mg) | 1 capsule | once daily | 14 days | Take before breakfast |
| SUSPENSION Paracetamol (250mg/5ml) | 10ml | every 6 hours | 5 days | For fever only |
    `;

    if (!extractedText) throw new Error("No text extracted from image");
    return extractedText;
  } catch (error) {
    console.error("Llama OCR Error:", error);
    return null;
  }
}

async function encodeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(`data:image/jpeg;base64,${reader.result.split(",")[1]}`);
      } else {
        reject(new Error("Failed to read file as Base64."));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
