import { useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/use-speech";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface VoiceInputButtonProps {
  onResult: (text: string) => void;
  size?: number;
  className?: string;
}

const VoiceInputButton = ({ onResult, size = 18, className = "" }: VoiceInputButtonProps) => {
  const { startListening, stopListening, isListening, isSupported, lastError } = useSpeechRecognition();
  const { language } = useLanguage();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isListening) {
      stopListening();
    } else {
      const started = startListening(language === "te" ? "te-IN" : "en-IN", onResult);
      if (!started) {
        toast.error("Voice input is not supported on this browser. Try Chrome or Safari on mobile.");
      }
    }
  };

  const title = !isSupported
    ? "Voice input unavailable on this browser"
    : isListening
      ? "Stop listening"
      : "Voice input";

  useEffect(() => {
    if (lastError === "not-allowed" || lastError === "service-not-allowed") {
      toast.error("Microphone permission is blocked. Please allow microphone access in the browser.");
    } else if (lastError && lastError !== "not_supported") {
      toast.error("Voice input failed. Please try again.");
    }
  }, [lastError]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!isSupported}
      className={`rounded-full p-2 transition-colors ${
        isListening
          ? "bg-emergency/20 text-emergency animate-pulse"
          : isSupported
            ? "text-muted-foreground hover:text-primary hover:bg-primary/10"
            : "cursor-not-allowed text-muted-foreground/50"
      } ${className}`}
      title={title}
      aria-label={title}
    >
      {isListening ? <MicOff size={size} /> : <Mic size={size} />}
    </button>
  );
};

export default VoiceInputButton;
