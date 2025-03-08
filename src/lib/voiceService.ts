
import { toast } from "sonner";

const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah's voice ID

export async function speakReminder(text: string, voiceId: string = DEFAULT_VOICE_ID): Promise<HTMLAudioElement | null> {
  try {
    // Simple validation
    if (!text) {
      throw new Error("Text is required for voice reminder");
    }

    // Create the audio
    const audio = new Audio();
    
    // Use the ElevenLabs Text-to-Speech API (free tier)
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": "free-tier" // Using free tier - for production, you would use a real API key
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });

    if (!response.ok) {
      // Fallback to browser's native speech synthesis if API fails
      return useBrowserSpeech(text);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    audio.src = audioUrl;
    return audio;
  } catch (error) {
    console.error("Voice reminder error:", error);
    // Fallback to browser's native speech synthesis
    return useBrowserSpeech(text);
  }
}

// Fallback to browser's native speech synthesis
function useBrowserSpeech(text: string): HTMLAudioElement | null {
  try {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9; // Slightly slower than normal
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
      
      // Return a dummy audio element for consistency with the main function
      return new Audio();
    } else {
      toast.error("Speech synthesis not supported in this browser");
      return null;
    }
  } catch (error) {
    console.error("Browser speech synthesis error:", error);
    toast.error("Failed to use speech synthesis");
    return null;
  }
}

// Helper function to create the voice reminder text
export function createReminderVoiceText(medicineName: string, dosage: string): string {
  return `It's time to take your medicine. ${medicineName}, ${dosage}.`;
}
