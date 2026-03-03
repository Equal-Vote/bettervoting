import { Box, Paper, Typography } from "@mui/material";

interface ResultsKeyProps {
    items: [string, string][]
}

const ResultsKey = ({items}: ResultsKeyProps) =>
    <Paper sx={{display: 'flex', gap: 3, ml: {xs: 'unset', md: 'auto'}, p: 2, flexDirection: 'column'}}>
            {items.map(([col, txt], i) => <Box key={i} display='flex' sx={{justifyContent: 'flex-start', flexDirection: 'row'}}>
                <Box sx={{
                    borderWidth: '3px',
                    borderColor: 'black',
                    borderRadius: '50%',
                    mr: 1,
                    my: 'auto',
                    width: '15px',
                    height: '15px',
                    backgroundColor: col
                }}/>
                <Typography sx={{maxWidth: '300px', textAlign: 'left'}}>{txt}</Typography>
            </Box>)
        }
    </Paper>

export default ResultsKey;