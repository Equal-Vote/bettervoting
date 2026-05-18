import { ReactNode, useEffect, useRef, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import useElection from '../ElectionContextProvider';

/**
 * Disables interaction with its children while an admin write is in flight.
 *
 * `inert` flips on immediately so a synchronous follow-up click can't slip
 * through. The dimming overlay is delayed by 500ms so fast writes don't
 * cause a visual flicker. A beforeunload guard catches tab close / reload
 * while a write is outstanding; in-app navigation is naturally blocked
 * because every nav control inside the admin layout sits inside the gate.
 */
const GRACE_MS = 500;

export default function ElectionInFlightGate({ children }: { children: ReactNode }) {
    const { inFlight } = useElection();
    const ref = useRef<HTMLDivElement | null>(null);
    const [showOverlay, setShowOverlay] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (inFlight) {
            // setAttribute is the only way to apply `inert` in React 17 —
            // it's not in the prop type and would be stripped from JSX.
            el.setAttribute('inert', '');
            el.setAttribute('aria-busy', 'true');
        } else {
            el.removeAttribute('inert');
            el.removeAttribute('aria-busy');
        }
    }, [inFlight]);

    useEffect(() => {
        if (!inFlight) {
            setShowOverlay(false);
            return;
        }
        const timer = setTimeout(() => setShowOverlay(true), GRACE_MS);
        return () => clearTimeout(timer);
    }, [inFlight]);

    useEffect(() => {
        if (!inFlight) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [inFlight]);

    return (
        <Box sx={{ position: 'relative', width: '100%' }}>
            <Box
                ref={ref}
                sx={{
                    opacity: showOverlay ? 0.6 : 1,
                    transition: 'opacity 150ms',
                    pointerEvents: inFlight ? 'none' : 'auto', // fallback for browsers without `inert`
                }}
            >
                {children}
            </Box>
            {showOverlay && (
                <Box
                    sx={{
                        position: 'fixed',
                        top: 80,
                        right: 24,
                        zIndex: (theme) => theme.zIndex.modal + 1,
                        bgcolor: 'background.paper',
                        boxShadow: 3,
                        borderRadius: 2,
                        px: 2,
                        py: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                    }}
                    role='status'
                    aria-live='polite'
                >
                    <CircularProgress size={18} />
                    <span>Saving…</span>
                </Box>
            )}
        </Box>
    );
}
