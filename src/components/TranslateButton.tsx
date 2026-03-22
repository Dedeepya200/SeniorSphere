import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface TranslateButtonProps {
  text: string;
  onTranslated: (translated: string) => void;
  size?: number;
  className?: string;
}

const TranslateButton = ({ text, onTranslated, size = 16, className = "" }: TranslateButtonProps) => {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [translated, setTranslated] = useState(false);
  const [originalText, setOriginalText] = useState("");

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (translated) {
      // Revert to original
      onTranslated(originalText);
      setTranslated(false);
      return;
    }

    setLoading(true);
    try {
      // Detect if text looks like Telugu (contains Telugu Unicode range)
      const isTelugu = /[\u0C00-\u0C7F]/.test(text);
      const targetLang = isTelugu ? "en" : "te";

      const { data, error } = await supabase.functions.invoke("translate", {
        body: { text, targetLang },
      });

      if (error) throw error;
      if (data?.translated) {
        setOriginalText(text);
        onTranslated(data.translated);
        setTranslated(true);
      }
    } catch (err) {
      console.error("Translation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`rounded-full p-1.5 transition-colors ${
        translated
          ? "bg-primary/20 text-primary"
          : "text-muted-foreground hover:text-primary hover:bg-primary/10"
      } ${className}`}
      title={translated ? "Show original" : "Translate"}
    >
      {loading ? (
        <Loader2 size={size} className="animate-spin" />
      ) : (
        <Languages size={size} />
      )}
    </button>
  );
};

export default TranslateButton;
