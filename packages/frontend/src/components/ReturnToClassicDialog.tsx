import { Dialog, DialogContent, Stack, Typography } from "@mui/material";
import { useState, createContext, useContext, ReactNode } from "react";
import { openFeedback, useSubstitutedTranslation } from "./util";
import { sharedConfig } from "@equal-vote/star-vote-shared/config";
import { PrimaryButton, SecondaryButton } from "./styles";

export interface IReturnToClassicContext{
    open: boolean,
    openDialog: () => void
    closeDialog: () => void
}

export const ReturnToClassicContext = createContext<IReturnToClassicContext>(null);

export const ReturnToClassicContextProvider = ({children}: {children: ReactNode}) => {
    const [open, setOpen] = useState(false);

    return <ReturnToClassicContext.Provider
        value={{
            open: open,
            openDialog: () => setOpen(true),
            closeDialog: () => setOpen(false)
        }}
    >
        {children}
    </ReturnToClassicContext.Provider>
}

const ReturnToClassicDialog = () => {
    const returnToClassicContext = useContext(ReturnToClassicContext);
    const {t} = useSubstitutedTranslation('election');
    return <>
        <Dialog open={returnToClassicContext.open} onClose={returnToClassicContext.closeDialog}>
            <DialogContent sx={{margin: 4}}>
                <Stack className="classicPopupInner">
                    <Typography align='center' >{t('return_to_classic.description')}</Typography>
                    <br/>
                    <PrimaryButton
                        onClick={() => {
                            openFeedback();
                            returnToClassicContext.closeDialog();
                        }}
                    >
                        {t('return_to_classic.feedback')}
                    </PrimaryButton>
                    <SecondaryButton
                        sx={{
                            mt: 2,
                        }}
                        onClick={() => {
                            window.location.href=sharedConfig.CLASSIC_DOMAIN;
                        }}
                    >
                        {t('return_to_classic.continue')}
                    </SecondaryButton>
                </Stack>
            </DialogContent>
        </Dialog>
    </>
}

export default ReturnToClassicDialog