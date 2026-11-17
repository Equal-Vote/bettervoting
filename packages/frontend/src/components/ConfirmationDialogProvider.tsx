import {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
} from 'react';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, TextField } from '@mui/material'
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
//
// With an optional text input (resolves to { text } instead of true):
// const result = await confirm({ title, message, textField: { label: 'Explanation (optional)' } })
// if (result) submit(result.text)

export interface ConfirmTextField {
    label: string
    placeholder?: string
    maxLength?: number
    // Defaults to a 3-row multiline field
    multiline?: boolean
}

interface ConfirmData {
    title: string
    message: React.ReactNode
    cancel?: string
    submit?: string
    dismissable?: boolean
    textField?: ConfirmTextField
}

// true / { text } when confirmed, false on cancel, null when dismissed
export type ConfirmTextResult = { text: string } | false | null

interface confirmContext {
    (data: ConfirmData & { textField: ConfirmTextField }): Promise<ConfirmTextResult>
    (data: ConfirmData): Promise<boolean | null>
}

const ConfirmDialog = createContext<confirmContext>(null);

type DialogState = {
    isOpen: boolean
    title: string
    message: React.ReactNode
    submit: string | null
    cancel: string | null
    dismissable: boolean
    textField: ConfirmTextField | null
}
const CLOSED: DialogState = { isOpen: false, title: '', message: '', submit: null, cancel: null, dismissable: false, textField: null };

export function ConfirmDialogProvider({ children }:  { children: React.ReactNode }) {
    const [state, setState] = useState<DialogState>(CLOSED);
    const [text, setText] = useState('');
    // Mirror of `text` that the resolver (created once per confirm() call, so
    // it would otherwise close over a stale value) can read at click time.
    const textRef = useRef('');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fn = useRef((choice: boolean | null) => {  });

    const {t} = useSubstitutedTranslation();

    const updateText = (value: string) => {
        textRef.current = value;
        setText(value);
    };

    const confirm = useCallback(
        (data: ConfirmData) => {
            return new Promise((resolve: (value: boolean | null | ConfirmTextResult) => void) => {
                updateText('');
                setState({ ...CLOSED, ...data, isOpen: true, dismissable: data.dismissable ?? false, textField: data.textField ?? null });
                fn.current = (choice) => {
                    resolve(choice && data.textField ? { text: textRef.current } : choice);
                    setState(CLOSED);
                };
            });
        },
        [setState]
    ) as confirmContext;

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
                    {/* pre-line so a caller can separate paragraphs with blank lines */}
                    <DialogContentText sx={{ whiteSpace: 'pre-line' }}>{state.message}</DialogContentText>
                    {state.textField && (
                        <TextField
                            fullWidth
                            multiline={state.textField.multiline ?? true}
                            minRows={state.textField.multiline === false ? undefined : 3}
                            label={state.textField.label}
                            placeholder={state.textField.placeholder}
                            value={text}
                            onChange={e => updateText(e.target.value)}
                            slotProps={{ htmlInput: { maxLength: state.textField.maxLength } }}
                            helperText={state.textField.maxLength ? `${text.length}/${state.textField.maxLength}` : undefined}
                            sx={{ mt: 2 }}
                        />
                    )}
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
