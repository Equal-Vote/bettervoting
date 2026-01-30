import { useEffect } from 'react';
import { Box } from '@mui/material';

/**
 * Election Simulator - A development tool for understanding and testing 
 * the complete election lifecycle without making any backend calls.
 * 
 * This component embeds the standalone simulator HTML in an iframe
 * to preserve its self-contained nature while integrating with the 
 * main frontend routing.
 */
const ElectionSimulator = () => {
  useEffect(() => {
    document.title = 'Election Simulator - BetterVoting Developer Tools';
  }, []);

  return (
    <Box
      sx={{
        width: '100%',
        height: 'calc(100vh - 180px)', // Account for header and footer
        minHeight: '600px',
      }}
    >
      <iframe
        src="/docs/dev/simulator.html"
        title="Election Simulator"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
      />
    </Box>
  );
};

export default ElectionSimulator;
