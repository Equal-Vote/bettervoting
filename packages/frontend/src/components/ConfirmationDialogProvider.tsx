import {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
} from 'react';
import { Box, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, Typography } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close';
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
    // Optional one-line captions rendered under the cancel / submit buttons
    cancelHint?: React.ReactNode
    submitHint?: React.ReactNode
    dismissable?: boolean
}

type confirmContext = (data: ConfirmData) => Promise<boolean | null>

const ConfirmDialog = createContext<confirmContext>(null);

export function ConfirmDialogProvider({ children }:  { children: React.ReactNode }) {
    const [state, setState] = useState({ isOpen: false, title: '', message: '', submit: null, cancel: null, cancelHint: null, submitHint: null, dismissable: false });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fn = useRef((choice: boolean | null) => {  });

    const {t} = useSubstitutedTranslation();
    const hasHints = Boolean(state.cancelHint || state.submitHint);

    const confirm = useCallback(
        (data: ConfirmData) => {
            return new Promise((resolve: (value: boolean | null) => void) => {
                setState({ ...state, ...data, isOpen: true, dismissable: data.dismissable ?? false });
                fn.current = (choice) => {
                    resolve(choice);
                    setState({ isOpen: false, title: '', message: '', submit: null, cancel: null, cancelHint: null, submitHint: null, dismissable: false });
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
                onClose={state.dismissable ? () => fn.current(null) : undefined}
            >
                <DialogTitle>
                    {state.title}
                    {state.dismissable && (
                        <IconButton
                            aria-label={t('keyword.close')}
                            onClick={() => fn.current(null)}
                            sx={{ position: 'absolute', right: 8, top: 8 }}
                        >
                            <CloseIcon />
                        </IconButton>
                    )}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>{state.message}</DialogContentText>
                </DialogContent>
                <DialogActions sx={{ alignItems: 'flex-start' }}>
                    {/* With hints, give each action half the row so the captions have room; without, keep the buttons right-aligned as before */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: hasHints ? 1 : undefined }}>
                        <SecondaryButton
                            type='button'
                            variant="outlined"
                            // width="100%"
                            fullWidth={false}
                            onClick={() => fn.current(false)}>
                            {state['cancel'] ?? t('keyword.cancel')}
                        </SecondaryButton>
                        {state.cancelHint && <Typography variant='caption' sx={{ mt: 1, textAlign: 'center' }}>{state.cancelHint}</Typography>}
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: hasHints ? 1 : undefined }}>
                        <PrimaryButton
                            type='button'
                            variant="contained"
                            fullWidth={false}
                            onClick={() => fn.current(true)}>
                            {state['submit'] ?? t('keyword.submit')}
                        </PrimaryButton>
                        {state.submitHint && <Typography variant='caption' sx={{ mt: 1, textAlign: 'center' }}>{state.submitHint}</Typography>}
                    </Box>
                </DialogActions>
            </Dialog>
        </ConfirmDialog.Provider>
    );
}

export default function useConfirm() {
    return useContext(ConfirmDialog);
}