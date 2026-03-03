import React, { ReactNode, useContext, useState } from 'react'
import { createContext, Dispatch, SetStateAction } from 'react'
import { Alert, Snackbar } from '@mui/material'

export interface Isnack {
    message: string,
    severity: 'error' | 'info' | 'success' | 'warning',
    open: boolean,
    autoHideDuration: number | null,
}

export interface ISnackBarContext {
    snack: Isnack;
    setSnack: Dispatch<SetStateAction<Isnack>>
}

export const SnackbarContext = createContext<ISnackBarContext>({
    snack: {
        message: '',
        severity: "info",
        open: false,
        autoHideDuration: null,
    },
    setSnack: () => false
}
)

export const SnackbarContextProvider = ({ children }: {children: ReactNode}) => {

    const [snack, setSnack] = useState<Isnack>({
        message: '',
        severity: "info",
        open: false,
        autoHideDuration: null,
    })

    const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnack({ ...snack, open: false })
    }

    return (
        <SnackbarContext.Provider value={{ snack, setSnack }}>
            <Snackbar open={snack.open} autoHideDuration={snack.autoHideDuration} onClose={handleClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity={snack.severity} onClose={handleClose}>
                    {snack.message}
                </Alert>
            </Snackbar>
            {children}
        </SnackbarContext.Provider>
    )
}


export default function useSnackbar() {
    return useContext(SnackbarContext);
}