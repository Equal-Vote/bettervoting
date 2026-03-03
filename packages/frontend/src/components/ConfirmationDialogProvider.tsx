import {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
} from 'react';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'
import { PrimaryButton, SecondaryButton } from './styles';
import { useSubstitutedTranslation } from './util';
// Built from this example buth with MUI dialogs: https://akashhamirwasia.com/blog/building-expressive-confirm-dialog-api-in-react/
// Uses a context provider to allow any component to access a confirm dialog component using the useConfirm hook
// Example: 
// import useConfirm from '../../ConfirmationDialogProvider';
// const confirm = useConfirm()
// const confirmed = await confirm(
//      {
//          title: 'Confirm This Action', 
//          message: "Are you sure you want to do this?"
//      })

interface ConfirmData {
    title: string
    message: string
    cancel?: string
    submit?: string
}

type confirmContext = (data: ConfirmData) => Promise<boolean>

const ConfirmDialog = createContext<confirmContext>(null);

export function ConfirmDialogProvider({ children }:  { children: React.ReactNode }) {
    const [state, setState] = useState({ isOpen: false, title: '', message: '', submit: null, cancel: null});
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fn = useRef((choice: boolean) => {  });

    const {t} = useSubstitutedTranslation();

    const confirm = useCallback(
        (data: ConfirmData) => {
            return new Promise((resolve: (value: boolean) => void) => {
                setState({ ...state, ...data, isOpen: true });
                fn.current = (choice) => {
                    resolve(choice);
                    setState({ isOpen: false, title: '', message: '', submit: null, cancel: null });
                };
            });
        },
        [setState]
    );

    return (
        <ConfirmDialog.Provider value={confirm}>
            {children}
            <Dialog
                open={state.isOpen}
                fullWidth
            >
                <DialogTitle>{state.title}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{state.message}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <SecondaryButton
                        type='button'
                        variant="outlined"
                        // width="100%"
                        fullWidth={false}
                        onClick={() => fn.current(false)}>
                        {state['cancel'] ?? t('keyword.cancel')}
                    </SecondaryButton>
                    <PrimaryButton
                        type='button'
                        variant="contained"
                        fullWidth={false}
                        onClick={() => fn.current(true)}>
                        {state['submit'] ?? t('keyword.submit')}
                    </PrimaryButton>
                </DialogActions>
            </Dialog>
        </ConfirmDialog.Provider>
    );
}

export default function useConfirm() {
    return useContext(ConfirmDialog);
}