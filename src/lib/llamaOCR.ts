import { toast } from "sonner";

// Helper function to resize an image to reduce its file size
async function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = Math.round(height * maxWidth / width);
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = Math.round(width * maxHeight / height);
          height = maxHeight;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            
            // Create new file from blob
            const newFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            
            resolve(newFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
}

export async function processPrescriptionImage({ file, apiKey }: { file: File; apiKey: string }): Promise<string | null> {
  try {
    if (!apiKey) throw new Error("Missing Together API Key");

    // Compress image if it's too large (common with mobile pictures)
    let processedFile = file;
    if (file.size > 1 * 1024 * 1024) { // If larger than 1MB
      try {
        processedFile = await compressImage(file);
        console.log(`Image compressed from ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`);
      } catch (compressionError) {
        console.warn("Image compression failed, using original:", compressionError);
        // Continue with original file if compression fails
      }
    }

    // Updated model to use Llama-Vision-Free
    const visionLLM = "meta-llama/Llama-Vision-Free";
    
    // Convert image file to Base64
    const finalImageUrl = await encodeImage(processedFile);

    const systemPrompt = `Extract and format only medicine details from prescription images in a structured format.

Extract the following medicine details from the provided prescription image:
- Medicine Name
- Dosage (e.g., 100 mg, 25 mg)
- Frequency (e.g., once daily, twice daily)
- Timing (e.g., morning, afternoon, night)
- Special Instructions (e.g., before/after food)
- Duration (e.g., for 7 days, for 1 month)

Format Output as:
[Medicine Name] ([Dosage]): [Frequency], [Timing], [Special Instructions], for [Duration].

Example Output:
FREXT (100 mg): 1 tablet, once daily after breakfast, for 1 month.
CLOFRANIL (25 mg): 1 tablet, once daily at night, for 1 month.
SIZODON (MD 0.5): 1 tablet, once daily at night, for 1 month.

⚠️ Notes:
- Ignore patient details, diagnosis, and doctor/hospital info.
- Ensure output is clean and follows the structured format.
- If any information is missing, skip it without adding assumptions.`;

    // Prepare request with timeout
    const requestBody = {
      model: visionLLM,
      messages: [
        { 
          role: "user", 
          content: [
            { type: "text", text: systemPrompt }, 
            { type: "image_url", image_url: { url: finalImageUrl } }
          ] 
        }
      ]
    };

    // Set timeout for fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60-second timeout

    try {
      // Make API call to Together AI
      const response = await fetch("https://api.together.xyz/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Together AI API error (${response.status}): `;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage += errorData.message || errorData.error || response.statusText;
        } catch {
          errorMessage += errorText || response.statusText;
        }
        
        console.error(errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const extractedText = data.choices[0]?.message?.content?.trim();

      if (!extractedText) throw new Error("No text extracted from image");
      
      // Log the extracted text to console
      console.log("Extracted Text:", extractedText);
      
      return extractedText;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // Handle specific errors
      if (fetchError.name === 'AbortError') {
        throw new Error("Request timed out. The image may be too complex or the service is currently busy.");
      }
      throw fetchError;
    }
  } catch (error) {
    console.error("Llama OCR Error:", error);
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("402")) {
        toast.error("API usage limit reached. Try again later or use sample data.");
        throw error; // Rethrow to handle in the component
      } else if (error.message.includes("API key")) {
        toast.error("API authentication failed. Please try again later.");
      } else if (error.message.includes("timed out")) {
        toast.error("Processing took too long. Try with a clearer or smaller image.");
      } else {
        toast.error(`Failed to extract text: ${error.message}`);
      }
    } else {
      toast.error("Failed to extract text from image. Please try again.");
    }
    
    return null;
  }
}

async function encodeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        // Make sure we have a proper data URL with base64 encoding
        if (reader.result.startsWith('data:')) {
          resolve(reader.result);
        } else {
          resolve(`data:${file.type};base64,${reader.result.split(",")[1]}`);
        }
      } else {
        reject(new Error("Failed to read file as Base64."));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
