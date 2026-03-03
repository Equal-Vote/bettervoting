
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import BubbleGrid from "./BubbleGrid";
import useSnackbar from '~/components/SnackbarContext';
import { IBallotContext } from '../VotePage';
import CandidateLabel from './CandidateLabel';
import { useMemo } from 'react';
import ColumnHeadings from './ColumnHeadings';

interface GenericBallotGridProps {
    ballotContext: IBallotContext;
    starHeadings: boolean;
    columns: string[];
    onClick: (candidateIndex: number, columnValue: number) => void;
    columnValues: number[];
    leftTitle: string;
    rightTitle: string;
}

export default function GenericBallotGrid({
    ballotContext,
    starHeadings,
    columns,
    onClick,
    columnValues,
    leftTitle,
    rightTitle,
    

}: GenericBallotGridProps) {
    const numHeaderRows = Number(leftTitle != '') + Number(columns.length > 1);
    const { setSnack } = useSnackbar();
    const dividerHeight = '2px';  //  Note that we can't use gap here
    const makeArea = (row, column, width = 1, height = 1) => {
        return `${row} / ${column} / ${row + height} / ${column + width}`
    }
    const rowColor = (rowIndex: number) => {
        if (rowIndex < numHeaderRows) return 'var(--brand-white)';
        const colors = [
            'var(--ballot-border-teal)',
            'var(--ballot-even-row-teal)',
            'var(--ballot-even-row-teal)',
            'var(--ballot-border-teal)',
            'var(--brand-white)',
            'var(--brand-white)',
        ]
        return colors[(rowIndex - numHeaderRows) % 6];
    }

    const fontSX = { fontSize: { xs: '.7rem', md: '.8rem' } }
    const gridTemplateRows = useMemo(() => {
        let rows = '';
        //left title is worst/best for STAR
        if (leftTitle !== '') {
          rows += 'auto ';
        }
        //this is for ranks, stars, etc
        if (columns.length > 1) {
          rows += 'auto ';
        }
        //top divider
        rows += `${dividerHeight} `;
        //Each candidate has 2 rows, one for the candidate name and one for the divider
        ballotContext.candidates.forEach(() => {
          rows += `auto minmax(50px, max-content) ${dividerHeight} `;
        });
        return rows.trim();
      }, [leftTitle, columns.length, dividerHeight, ballotContext.candidates.length]);
    const rowBackgrounds = useMemo(() => {
        const rowBackgrounds = [];
        //Rows break down as follows: 1 header row, 3 rows for each candidate to include divider, and 1 row for top divider
        for (let rowIndex = 0; rowIndex < numHeaderRows + 3 * ballotContext.candidates.length + 1; rowIndex++) {
            rowBackgrounds.push(
                <Box
                    key={rowIndex}
                    className={(rowIndex == numHeaderRows + 3*ballotContext.candidates.length || (rowIndex == 0 && numHeaderRows==0)) && 'hiddenInHero'}
                    sx={{
                        gridArea: makeArea(rowIndex + 1, 1, 2 + columns.length),
                        mx: '-500px',
                        background: rowColor(rowIndex),
                        height: '100%'
                    }}
                />
            );
        }

        return rowBackgrounds;
    }, [numHeaderRows, columns.length, ballotContext.candidates.length]);

    /* TODO: this code was refactored to use CSS grid. This made it cleaner on an structural level, but the code looks messy and could be cleaned up*/
    return <Box sx={{
        width: '100%',
        display: 'flex',
        /* this is for the gap color, it's not possible to set that directly https://stackoverflow.com/questions/45884630/css-grid-is-it-possible-to-apply-color-to-grid-gaps*/
        overflow: 'hidden',
    }}>
        <Box sx={{
            display: 'grid',
            gridTemplateColumns: {
                xs: `0px repeat(${columns.length}, minmax(30px, ${columns.length == 1 ? '100%' : '40px'}))`,
                sm: `fit-content(300px) repeat(${columns.length}, minmax(30px, 40px))`,
            },
            gridTemplateRows: gridTemplateRows,
            filter: ballotContext.instructionsRead ? '' : 'blur(.4rem)',
            margin: 'auto',
            px: '10px',
            overflow: 'visible', // important for the row backgrounds
        }} onClick={() => {
            if (ballotContext.instructionsRead) return;
            setSnack({
                message: 'Must read instructions first',
                severity: 'info',
                open: true,
                autoHideDuration: 6000,
            })
        }}>

            {/* Row Backgrounds */}
            {rowBackgrounds}
            {/* Column Warnings */}
            {ballotContext.warningColumns && ballotContext.warningColumns.map((columnValue, columnIndex) =>
                <Box key={columnIndex} aria-label={`Warning: Skipped Column ${columnValue}`}
                    sx={{
                        gridArea: makeArea(1, 1 + columnValue, 1, numHeaderRows + 1 + ballotContext.candidates.length * 3),
                        height: '100%',
                        backgroundColor: "brand.warningColumn"
                    }}
                />
            )}

            {/* HEADING TITLES (i.e. worst best for STAR )*/}
            {leftTitle != '' && <>
                {/* 1 px / 100 px is a hack to make sure the titles don't affect the other boxes in the column */}
                <Box sx={{ width: '1px', margin: 'auto', gridArea: makeArea(1, 2) }}>
                    <Typography width='100px' align='center' className="columnDescriptor" sx={{ transform: 'translate(-50%)' }}>{leftTitle}</Typography>
                </Box>
                <Box sx={{ width: '1px', margin: 'auto', gridArea: makeArea(1, 1 + columns.length) }}>
                    <Typography width='100px' align='center' className="columnDescriptor" sx={{ transform: 'translate(-50%)' }}>{rightTitle}</Typography>
                </Box>
            </>}

            {/* HEADINGS (i.e. stars, ranks, etc) */}
            {columns.length > 1 && <>
                {columns.map((columnTitle, columnIndex) => 
                <ColumnHeadings
                    key={columnIndex}
                    columnIndex={columnIndex}
                    columnTitle={columnTitle}
                    gridArea={makeArea(numHeaderRows, 2 + columnIndex)}
                    starHeadings={starHeadings}
                    fontSX={fontSX}
                />)}
            </>}

            {/* Candidates */}
            {ballotContext.candidates.map((candidate, candidateIndex) =>
                <CandidateLabel
                    key={candidateIndex}
                    //make area is 1 indexed, so we add 1 to candidateIndex, 
                    //and 1 to numHeaderRows to account for the divider between the header and the candidates
                    //and multiply by 2 to account for each candidate having a name and a divider
                    candidate={candidate} gridArea={{
                        xs: makeArea(numHeaderRows + 1 + 3 * candidateIndex + 1, 1, 2 + columns.length),
                        sm: makeArea(numHeaderRows + 1 + 3 * candidateIndex + 2, 1),
                    }}/>
            )}
            <BubbleGrid
                ballotContext={ballotContext}
                columnValues={columnValues}
                columns={columns}
                numHeaderRows={numHeaderRows}
                onClick={onClick}
                makeArea={makeArea}
                fontSX={fontSX}
            />
        </Box>
    </Box>
}