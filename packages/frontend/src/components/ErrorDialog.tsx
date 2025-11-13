import React, { useEffect } from "react";
import ReactDOM from "react-dom";

interface ErrorDialogProps {
    title: string;
    message: string;
    onClose: () => void;
}

/** Internal component — you normally call showErrorDialog() instead */
const ErrorDialog: React.FC<ErrorDialogProps> = ({ title, message, onClose }) => {
    // close on Escape key
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0, 0, 0, 0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10000,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: "#fff",
                    borderRadius: 12,
                    border: "2px solid #d32f2f",
                    padding: "22px 28px",
                    maxWidth: 400,
                    width: "90%",
                    boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
                    fontFamily: "sans-serif",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 style={{ margin: "0 0 12px 0", fontSize: "1.2rem" }}>{title}</h2>
                <p style={{ marginBottom: 20, whiteSpace: "pre-line" }}>{message}</p>
                <div style={{ textAlign: "right" }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: "8px 16px",
                            borderRadius: 6,
                            backgroundColor: "#d32f2f",
                            color: "white",
                            border: "none",
                            cursor: "pointer",
                        }}
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * Show an error dialog with a title and message.
 * Works like window.alert() but styled and React-based.
 */
export function showErrorDialog(title: string, message: string) {
    const div = document.createElement("div");
    document.body.appendChild(div);

    const handleClose = () => {
        ReactDOM.unmountComponentAtNode(div);
        div.remove();
    };

    ReactDOM.render(
        <ErrorDialog title={title} message={message} onClose={handleClose} />,
        div
    );
}
