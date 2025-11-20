// src/hooks/useConfirm.tsx
import React, { useState } from "react";

export function useConfirm() {
    const [state, setState] = useState({
        open: false,
        message: "",
        resolve: (value: boolean) => {},
    });

    const confirm = (message: string) =>
        new Promise<boolean>((resolve) => {
            setState({ open: true, message, resolve });
        });

    const handleClose = (value: boolean) => {
        setState((prev) => {
            prev.resolve(value);
            return { ...prev, open: false };
        });
    };

    const ConfirmDialog = state.open ? (
        <div style={overlay}>
        <div style={dialog}>
            <h3>Confirm</h3>
            <p>{state.message}</p>
            <div style={{ marginTop: 20 }}>
    <button onClick={() => handleClose(true)} style={yesButton}>
        Yes
        </button>
        <button onClick={() => handleClose(false)} style={noButton}>
        No
        </button>
        </div>
        </div>
        </div>
) : null;

    return { confirm, ConfirmDialog };
}

const overlay: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
};

const dialog: React.CSSProperties = {
    background: "white",
    padding: "24px 36px",
    borderRadius: "10px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
    textAlign: "center",
    fontFamily: "'Roboto', sans-serif",
};

const yesButton: React.CSSProperties = {
    marginRight: "10px",
    backgroundColor: "#2196F3",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "4px",
    cursor: "pointer",
};

const noButton: React.CSSProperties = {
    backgroundColor: "#f0f0f0",
    border: "none",
    padding: "8px 16px",
    borderRadius: "4px",
    cursor: "pointer",
};
