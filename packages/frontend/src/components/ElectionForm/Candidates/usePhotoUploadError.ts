import { useTranslation } from "react-i18next";
import useSnackbar from "../../SnackbarContext";

// Reports a photo upload the server refused (too large, not an image, ...) in a snackbar,
// using the server's explanation when it gave one.
export const usePhotoUploadError = () => {
    const { setSnack } = useSnackbar();
    const { t } = useTranslation();

    return (message?: string) => setSnack({
        message: message ?? t('verified_email.photo_failed'),
        severity: 'error', open: true, autoHideDuration: null,
    });
};
