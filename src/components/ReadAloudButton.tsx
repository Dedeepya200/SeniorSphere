import { Volume2, VolumeX } from "lucide-react";
import { useSpeechSynthesis } from "@/hooks/use-speech";
import { useLanguage } from "@/contexts/LanguageContext";

interface ReadAloudButtonProps {
  text: string;
  size?: number;
  className?: string;
}

const ReadAloudButton = ({ text, size = 16, className = "" }: ReadAloudButtonProps) => {
  const { speak, stop, isSpeaking } = useSpeechSynthesis();
  const { language } = useLanguage();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSpeaking) {
      stop();
    } else {
      // Auto-detect Telugu text regardless of app language setting
      const isTelugu = /[\u0C00-\u0C7F]/.test(text);
      speak(text, isTelugu ? "te-IN" : "en-IN");
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`rounded-full p-1.5 transition-colors ${
        isSpeaking
          ? "bg-primary/20 text-primary"
          : "text-muted-foreground hover:text-primary hover:bg-primary/10"
      } ${className}`}
      title={isSpeaking ? "Stop" : "Read aloud"}
    >
      {isSpeaking ? <VolumeX size={size} /> : <Volume2 size={size} />}
    </button>
  );
};

export default ReadAloudButton;
