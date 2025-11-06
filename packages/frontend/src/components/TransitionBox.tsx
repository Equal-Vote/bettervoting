import { Box } from "@mui/material";
import { useState } from "react";

type TransitionBoxState = 'entering' | 'exiting' | 'pending_enter';

const TRANSITION_SECONDS = 0.2;

const TOP_VALUES = {
    entering: 0,
    exiting: -20,
    pending_enter: 20
}

export const useTransitionBoxState = (defValue : TransitionBoxState = 'pending_enter') => {
  const [value, setValue] = useState(defValue);
  return [
    value,
    (newValue) => {
        setValue(newValue);
        if(newValue == 'exiting'){
            setTimeout(() => setValue('pending_enter'), (TRANSITION_SECONDS*1000)+1);
        }
    }
  ]
}

export const TransitionBox = ({state, sx={}, absolute=false, children}) => <Box sx={{
  opacity: state === 'entering' ? 1 : 0,
  top: TOP_VALUES[state],
  pointerEvents: state === 'entering' ? 'auto' : 'none',
  transition: `opacity ${TRANSITION_SECONDS}s, top ${TRANSITION_SECONDS}s`,
  position: absolute? 'absolute' : 'relative',
  width: '100%',
  ...sx,
}}> {children} </Box>

