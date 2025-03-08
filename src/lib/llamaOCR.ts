
import { toast } from "sonner";

export async function processPrescriptionImage({ file, apiKey }: { file: File; apiKey: string }): Promise<string | null> {
  try {
    if (!apiKey) throw new Error("Missing Together API Key");

    const visionLLM = "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo";
    
    // Convert image file to Base64
    const finalImageUrl = await encodeImage(file);

    const systemPrompt = `Convert the provided image into Markdown format. Ensure that all content from the page is included, such as headers, footers, subtexts, images (with alt text if possible), tables, and any other elements.
    create a reminder card for each medicine with all its detail.
    
    Requirements:
    
    - Output Only Markdown: Return solely the Markdown content without any additional explanations or comments.
    - No Delimiters: Do not use code fences or delimiters like \`\`\`markdown.
    - Complete Content: Do not omit any part of the page, including headers, footers, and subtext.
    `;

    // Prepare request
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

    // Make API call to Together AI
    const response = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Together AI API error: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    const extractedText = data.choices[0]?.message?.content?.trim();

    if (!extractedText) throw new Error("No text extracted from image");
    
    // Log the extracted text to console
    console.log("Extracted Text:", extractedText);
    
    return extractedText;
  } catch (error) {
    console.error("Llama OCR Error:", error);
    toast.error("Failed to extract text from image: " + (error instanceof Error ? error.message : "Unknown error"));
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
