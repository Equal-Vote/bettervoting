import { useEffect } from 'react';
import Results from './Results';
import Box from '@mui/material/Box';
import { Typography } from "@mui/material";
import { useSubstitutedTranslation } from '../../util';
import { useGetResults } from '../../../hooks/useAPI';
import useElection from '../../ElectionContextProvider';
import DraftWarning from '../DraftWarning';
import ShareButton from '../ShareButton';
import { BallotDataExport } from './BallotDataExport';
import SupportBlurb from '../SupportBlurb';
import { Election } from '@equal-vote/star-vote-shared/domain_model/Election';

const ViewElectionResults = () => {
    const { election } = useElection();
    const { data, isPending, makeRequest: getResults } = useGetResults(election.election_id)
    useEffect(() => { getResults() }, [])
    const {t} = useSubstitutedTranslation(election.settings.term_type);

    return (
      <>
        <DraftWarning />
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          sx={{ width: "100%", textAlign: "center" }}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: "1200px",
              m: { xs: 0, m: 2 },
              p: { xs: 1, m: 2 },
              backgroundColor: "brand.white",
              marginBottom: 2,
              "@media print": { boxShadow: "none" },
            }}
          >
            <Typography variant="h3" component="h3" sx={{ marginBottom: 4 }}>
              {election.state === "closed"
                ? t("results.official_title")
                : t("results.preliminary_title")}
            </Typography>
            <Typography variant="h4" component="h4">
              {t("results.election_title", { title: election.title })}
            </Typography>

              {isPending && <div> {t("results.loading_election")} </div>}
            {!isPending && !data && (
              <>
                The election admins have not released the results yet. Feel free
                to swing back later 😊.
              </>
            )}

            {data?.results.map((results, race_index) => (
                <Results
                    key={`results-${race_index}`}
                    race={election.races[race_index]}
                    results={results}
                />
            ))}

            <hr />
            <Box
              sx={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                p: 2,
              }}
            >
              <Box
                sx={{
                  width: "100%",
                  maxWidth: 750,
                  display: "flex",
                  justifyContent: "space-between",
                  flexDirection: { xs: "column", sm: "row" },
                }}
              >
                {election.settings.public_results === true && (
                  <Box
                    sx={{
                      width: "100%",
                      
                     
                      p: 0.8,
                      px: { xs: 5, sm: 1 },
                    }}
                  >

                    <BallotDataExport election={election as Election}/>
                  </Box>
                )}

                  {/* voting method is currently below here */}

                {election.settings.voter_access !== "closed" && (
                  <Box
                    sx={{
                      width: "100%",
                      
                      p: 2,
                      px: { xs: 5, sm: 1 },
                    }}
                  >
                    <ShareButton
                      url={`${window.location.origin}/${election.election_id}`}
                    />
                  </Box>
                )}
              </Box>
            </Box>
            <a href="https://www.equal.vote/donate">
              {t("ballot_submitted.donate")}
            </a>
          </Box>
        </Box>
        <SupportBlurb />
      </>
    );
}
export default ViewElectionResults

