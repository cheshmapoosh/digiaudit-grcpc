import { Toast } from "@ui5/webcomponents-react";
import { useEffect, useRef, useState } from "react";
import {
    subscribeToToasts,
    type ToastMessage,
} from "@/shared/feedback/toast.store";

type SuccessToastEventDetail = {
    text?: string;
    duration?: number;
};

export default function AppToast() {
    const [message, setMessage] = useState<ToastMessage | null>(null);
    const [open, setOpen] = useState(false);
    const reopenTimerRef = useRef<number | null>(null);

    useEffect(() => {
        return subscribeToToasts((nextMessage) => {
            if (reopenTimerRef.current !== null) {
                window.clearTimeout(reopenTimerRef.current);
            }

            setOpen(false);
            reopenTimerRef.current = window.setTimeout(() => {
                setMessage(nextMessage);
                setOpen(true);
                reopenTimerRef.current = null;
            }, 0);
        });
    }, []);

    useEffect(() => {
        const handleSuccessToastEvent = (event: Event) => {
            const detail = (event as CustomEvent<SuccessToastEventDetail>).detail;
            const text = detail?.text?.trim();

            if (!text) {
                return;
            }

            if (reopenTimerRef.current !== null) {
                window.clearTimeout(reopenTimerRef.current);
            }

            setOpen(false);
            reopenTimerRef.current = window.setTimeout(() => {
                setMessage({
                    id: Date.now(),
                    kind: "success",
                    text,
                    duration: detail.duration ?? 3000,
                });
                setOpen(true);
                reopenTimerRef.current = null;
            }, 0);
        };

        window.addEventListener("grcpc:success-toast", handleSuccessToastEvent);

        return () => {
            window.removeEventListener("grcpc:success-toast", handleSuccessToastEvent);
        };
    }, []);

    useEffect(() => {
        return () => {
            if (reopenTimerRef.current !== null) {
                window.clearTimeout(reopenTimerRef.current);
            }
        };
    }, []);

    if (!message) {
        return null;
    }

    return (
        <Toast
            key={message.id}
            className="grc-success-toast"
            duration={message.duration}
            open={open}
            placement="TopCenter"
            onClose={() => setOpen(false)}
        >
            {message.text}
        </Toast>
    );
}
