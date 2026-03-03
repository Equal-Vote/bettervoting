import { Box } from "@mui/material";
import React from "react";
import { useState } from 'react';
import Pages from "./Pages";

interface WinnerResultPagesProps {
  children: React.ReactNode | React.ReactNode[]; // Allow both single child and array of children
  numWinners: number; 
}

const WinnerResultPages = ({ children, numWinners }: WinnerResultPagesProps) => {
  const [page, setPage] = useState(1);
  const currentTab = page - 1;

  const childArray = React.Children.toArray(children); // Ensure it's an array

  return (
    < Pages
      pageCount={numWinners} page={page} setPage={setPage} 
    >
      {childArray.map((child, i) => (
        <Box
          className={ i === currentTab ?
            'winnerResult activeWinnerResults' : 'winnerResult'
          }
          key={`winner-page-${i}`} // Ensure a stable, unique key
        >
          {child}
        </Box>
      ))}
    </Pages>
  );
};

export default WinnerResultPages
