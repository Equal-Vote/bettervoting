import { Card, CardActionArea, CardContent, Typography } from "@mui/material";
import { useEffect } from 'react';
import { useNavigate } from "react-router";
import { useGetElection } from "../../hooks/useAPI";

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace Intl {
  class ListFormat {
    constructor(locales?: string | string[], options?: object);
    public format: (items: string[]) => string;
  }
}
const formatter = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });

const FeaturedElection = ({electionId}: { electionId: string }) => {
    const navigate = useNavigate();
    const { data, makeRequest: fetchElections } = useGetElection(electionId);

    useEffect(() => {
        if (!electionId) return;
        //isMounted is used to prevent memory leaks by ensuring that the component is still mounted before updating the state
        let isMounted = true;

        const fetchData = async () => {
  
            if (isMounted) {
                await fetchElections();            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [electionId]);

    return <Card className='featuredElection' onClick={() => navigate(`/${electionId}`)} elevation={8} sx={{
        width: '100%',
        maxWidth: '20rem',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: '0',
    }}>
        <CardActionArea sx={{p: { xs: 2, md: 2 }, backgroundColor: 'lightShade.main'}}>
            <CardContent>
                <Typography variant='h5' color={'lightAccent.contrastText'}>{data == null ? 'null' : data.election.title}</Typography>
                <Typography sx={{textAlign: 'right', color: 'lightAccent.contrastText'}}>
                    {data == null ? 'null' : formatter.format(data.election.races.map((race) => race.voting_method))}
                </Typography>
            </CardContent>
        </CardActionArea>
    </Card>
}

export default FeaturedElection
