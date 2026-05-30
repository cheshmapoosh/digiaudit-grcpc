export type ToastKind = "success";

export type ToastMessage = {
    id: number;
    kind: ToastKind;
    text: string;
    duration: number;
};

type ToastListener = (message: ToastMessage) => void;

const listeners = new Set<ToastListener>();

let sequence = 0;

export function subscribeToToasts(listener: ToastListener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function showSuccessToast(text: string, duration = 3000): void {
    const message: ToastMessage = {
        id: Date.now() + sequence++,
        kind: "success",
        text,
        duration,
    };

    listeners.forEach((listener) => listener(message));
}
