import { Election } from "@equal-vote/star-vote-shared/domain_model/Election"
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { CardActionArea } from "@mui/material";
import { FormattedDescription } from './FormattedDescription';

type ElectionCardProps = {
    election: Election
}

const ElectionCard = ({ election }: ElectionCardProps) => {

    return (
        <Card >
            {/* //sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }} */}
            <CardActionArea href={`/${String(election.election_id)}`} >
                <CardContent>
                    <Typography align='center' gutterBottom variant="h4" component="h4">
                        {election.title}
                    </Typography>
                    <FormattedDescription
                        description={election.description}
                        align='left'
                        gutterBottom
                    />
                </CardContent>
            </CardActionArea>
        </Card>
    )
}

export default ElectionCard
