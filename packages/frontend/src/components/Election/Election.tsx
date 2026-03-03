import { useParams } from "react-router";
import { useEffect } from 'react'
import ElectionHome from "./ElectionHome";
import VotePage from './Voting/VotePage'
import Admin from './Admin/Admin'
import ViewElectionResults from './Results/ViewElectionResults'
import { Routes, Route } from 'react-router-dom'
import Sidebar from "./Sidebar";
import { Box } from "@mui/material";
import Thanks from "./Voting/Thanks";
import VerifyBallot from  "./Voting/VerifyBallot";
import { ElectionContextProvider } from "../ElectionContextProvider";
import { useElectionExists } from "../../hooks/useAPI";
import { sharedConfig } from "@equal-vote/star-vote-shared/config";
import { AnonymizedBallotsContextProvider } from "../AnonymizedBallotsContextProvider";

const Election = () => {
  const { id } = useParams();
  const {data, makeRequest: fetchExists } = useElectionExists(id)
  if(data?.exists === 'classic'){
    window.location.href = `${sharedConfig.CLASSIC_DOMAIN}/${id}`;
  }

  useEffect(() => {
      fetchExists()
  }, [id])

  return (
    <ElectionContextProvider id={id} >
      <AnonymizedBallotsContextProvider id={id}>
        <Box display='flex' sx={{flexDirection: {xs: 'column', md: 'row'}, mt: {xs: 0, sm: 5}, mb: {xs: 0, sm: 5}}}>
          <Box sx={{maxWidth: {xs: '100%', md: '16%'}}}>
            <Sidebar />
          </Box>
          <Box sx={{mt: '0', width: '100%'}}>
            <Routes>
              <Route path='/' element={<ElectionHome />} />
              <Route path='/vote' element={<VotePage />} />
              <Route path='/thanks' element={<Thanks />} />
              <Route path='/results' element={<ViewElectionResults />} />
              <Route path='/admin/*' element={<Admin />} />
              <Route path='/ballot/:ballot_id' element={<VerifyBallot />} />
              <Route path='/id/:voter_id' element={<ElectionHome />} />
            </Routes>
          </Box>
        </Box>
      </AnonymizedBallotsContextProvider>
    </ElectionContextProvider>
  )
}

export default Election
