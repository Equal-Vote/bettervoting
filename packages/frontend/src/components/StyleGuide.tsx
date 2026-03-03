import Box from '@mui/material/Box';
import { Typography } from "@mui/material";
import WidgetContainer from './Election/Results/components/WidgetContainer';
import Widget from './Election/Results/components/Widget';
import ResultsBarChart from './Election/Results/components/ResultsBarChart';

const StyleGuide = () => {
    return (<>
        <Box
            display='flex'
            justifyContent="center"
            alignItems="center"
            sx={{ width: '100%', textAlign: 'center'}}
        >
            <Box sx={{width: '100%', maxWidth: '1200px', m: {xs: 0, m: 2}, p: {xs: 1, m: 2}, backgroundColor:'brand.white', marginBottom: 2, '@media print': { boxShadow: 'none'}}}>
                <Typography variant="h3" component="h3" sx={{marginBottom: 4}}>
                    Style Guide Reference (h3)
                </Typography>
                <Typography variant="h4" component="h4">
                    Presidential Election (h4)
                </Typography>
                <hr/>
                <Typography variant="h3" component="h3" sx={{marginBottom: 2}}>
                    Race #1 (h3)
                </Typography>
                <div className="flexContainer" style={{textAlign: 'center'}}>
                    <Typography variant='h5'>⭐ John and Jane Doe Win! ⭐ (h5)</Typography>
                    <Typography variant="h6">100 votes (h6)</Typography>
                    <Box className="resultViewer">
                        <WidgetContainer>
                            <Widget title='Results'>
                                <ResultsBarChart
                                    data={[
                                        {name: 'John', votes: 100},
                                        {name: 'Jane', votes: 100},
                                        {name: 'Carl', votes: 50},
                                    ]}
                                    percentage
                                />
                            </Widget>
                        </WidgetContainer>
                    </Box>
                </div>
                <hr/>
                <a href='https://www.equal.vote/donate'>Donate (a tag)</a>
            </Box>
        </Box>
    </>)
}

export default StyleGuide