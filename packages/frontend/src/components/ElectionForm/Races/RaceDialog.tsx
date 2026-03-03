import { useEffect, useRef } from 'react';
import { useSubstitutedTranslation } from '../../util';
import { Box, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material"
import { PrimaryButton, SecondaryButton } from '../../styles';
import useElection from '../../ElectionContextProvider';


interface RaceDialogProps {
    onSaveRace: () => void;
    open: boolean;
    handleClose: () => void;
    children: React.ReactNode;
}

export default function RaceDialog({
  onSaveRace, open, handleClose, children
}: RaceDialogProps) {
    const { election, t } = useElection()
    const handleSave = () => onSaveRace()

    const onClose = (event, reason) => {
        if (reason && reason == "backdropClick")
            return;
        handleClose();
    }

    const dialogContentRef = useRef<HTMLDivElement>(null);

    useEffect( () => {
      if (open) {
        setTimeout( () => {
          if (dialogContentRef.current) {
            dialogContentRef.current.scrollTop = 0;
          }
        }, 100);
      };
    }, [open]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            scroll={'paper'}
            keepMounted>
            <DialogTitle> Edit Race </DialogTitle>
            <DialogContent ref={dialogContentRef}>
                {children}
            </DialogContent>
            <DialogActions>
                {election.state === 'draft' ?
                    <>
                        <SecondaryButton onClick={handleClose}>
                           {t('keyword.cancel')}
                        </SecondaryButton >
                        <PrimaryButton
                            onClick={() => handleSave()}
                        >
                           {t('keyword.save')}
                        </PrimaryButton>
                    </>
                :
                    <PrimaryButton onClick={handleClose}>
                        {t('keyword.close')}
                    </PrimaryButton >
                }
            </DialogActions>
        </Dialog>
    )
}
