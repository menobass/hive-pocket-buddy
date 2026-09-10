import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";

const DISMISS_KEY = "hive-widget:install-dismissed";

type InstallPromptEvent = Event & { prompt: () => Promise<void> };

export function InstallHint() {
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    setIsIos(ios);
    if (ios) setVisible(true);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="flex items-start gap-2 rounded-xl border border-border bg-surface p-3 text-xs text-muted-foreground">
      <Share className="mt-0.5 h-4 w-4 shrink-0 text-hive" />
      <div className="flex-1">
        {isIos ? (
          <p>
            Add this to your home screen: tap <strong className="text-foreground">Share</strong>,
            then <strong className="text-foreground">Add to Home Screen</strong>.
          </p>
        ) : (
          <p>Install it for one-tap access from your home screen.</p>
        )}
        {!isIos && deferred && (
          <button
            type="button"
            onClick={() => {
              void deferred.prompt();
              dismiss();
            }}
            className="mt-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            Install
          </button>
        )}
      </div>
      <button type="button" onClick={dismiss} aria-label="Dismiss">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
