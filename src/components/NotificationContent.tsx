import { useState } from "react";
import ReadAloudButton from "./ReadAloudButton";
import TranslateButton from "./TranslateButton";

interface NotificationContentProps {
  title: string;
  message: string;
  readAloudSize?: number;
  translateSize?: number;
}

const NotificationContent = ({
  title,
  message,
  readAloudSize = 14,
  translateSize = 14,
}: NotificationContentProps) => {
  const [displayText, setDisplayText] = useState(`${title}\n${message}`);

  const [displayTitle, displayMessage = ""] = displayText.split("\n", 2);

  return (
    <>
      <div className="flex-1 min-w-0">
        <p className="text-senior-sm font-bold">{displayTitle}</p>
        <p className="text-senior-sm text-muted-foreground">{displayMessage}</p>
      </div>
      <div className="flex items-start gap-1">
        <TranslateButton
          text={`${title}\n${message}`}
          onTranslated={setDisplayText}
          size={translateSize}
        />
        <ReadAloudButton text={`${displayTitle}. ${displayMessage}`} size={readAloudSize} />
      </div>
    </>
  );
};

export default NotificationContent;
