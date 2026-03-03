import { Box, Typography } from '@mui/material'
import ScoreIcon from './ScoreIcon'

interface ColumnHeadingsProps {
    columnIndex: number;
    columnTitle: string;
    gridArea: string;
    starHeadings: boolean;
    fontSX: object;
}
export default function ColumnHeadings({ columnIndex, columnTitle, gridArea, starHeadings, fontSX }: ColumnHeadingsProps) {
    return (
        <Box key={columnIndex} sx={{ gridArea: gridArea }}className='column-headings'>
            {starHeadings &&
                <ScoreIcon
                    // NOTE: I tried doing this in CSS with :first-child but it didn't work
                    opacity={columnIndex == 0 ? 0 : 1}
                    value={columnTitle}
                    fontSX={fontSX}
                />
            }
            {!starHeadings &&
                <Typography align='center' sx={{ ...fontSX }}>
                    <b>{columnTitle}</b>
                </Typography>
            }
        </Box>
    )
}