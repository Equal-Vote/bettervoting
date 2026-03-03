/*
  IRVTopResultsView --
  View the part of the IRV results that come at the top, above the optional
  extra details.
*/

import { Box } from "@mui/material";
import Typography from '@mui/material/Typography';
import { useState } from 'react';
import { irvContext, irvWinnerSearch } from "./ifc";
import { IRVWinnerView } from "./winner";
import Pages from "../Pages";
import useRace from "~/components/RaceContextProvider";

export function IRVTopResultsView ( {wins, context}:
  {wins: irvWinnerSearch[], context: irvContext}
) {

  const {t} = useRace();
  /* Only paginate if there is more than one page. */

  if (1 === wins.length)
    return IRVWinnerView({win: wins[0], context});

  const [page, setPage] = useState(1);
  const winIndex = page - 1;
  return <>
    <Typography variant="h5" component="h5">
      {t('results.rcv.bloc_results_title')}
    </Typography>
    <Pages
      pageCount={wins.length} page={page} setPage={setPage}
    >
      <Box className="resultWidget">
        <IRVWinnerView win={wins[winIndex]} context={context}/>
      </Box>
    </Pages>
  </>
}
