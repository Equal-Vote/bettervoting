import { useTranslation } from "react-i18next";
import useAuthSession from "../../AuthSessionContextProvider";
import useSnackbar from "../../SnackbarContext";

// The server only accepts image uploads from a signed-in account with a verified email.
// canUpload() says why not (in a snackbar) before any upload is attempted; onUploadError
// reports a refusal that happens anyway (e.g. the session expired).
export const usePhotoUploadGuard = () => {
    const authSession = useAuthSession();
    const { setSnack } = useSnackbar();
    const { t } = useTranslation();

    const warn = (message: string) => setSnack({ message, severity: 'error', open: true, autoHideDuration: null });

    const canUpload = () => {
        if (authSession.hasVerifiedEmail()) return true;
        warn(t(authSession.isLoggedIn() ? 'verified_email.photo_unverified' : 'verified_email.photo_sign_in'));
        return false;
    };

    const onUploadError = (message?: string) => warn(message ?? t('verified_email.photo_failed'));

    return { canUpload, onUploadError };
};
