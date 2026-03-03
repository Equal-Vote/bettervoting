import { TableContainer, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";

function CellViewer({ cell }: { cell: number | null }) {
  if (cell === null) return <></>;

  return (
    <h3 className='cell'>
      {cell}
    </h3>
  );
}

interface Results {
  summaryData: {
    candidates: { name: string }[];
    preferenceMatrix: (number | null)[][];
    pairwiseMatrix: number[][];
  };
}

export default function MatrixViewer({ results }: { results: Results }) {
  return (
      <TableContainer sx={{ maxHeight: 600, maxWidth: {xs:300, sm: 500, md: 600, lg: 1000}}}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              <TableCell
                style={{
                  position: 'sticky',
                  left: 0,
                  background: 'white',
                  zIndex: 900,
                  minWidth: 100
                }}
                align='center'
                key={``}> </TableCell>
              {results.summaryData.candidates.map((c, n) => (
                <TableCell
                  align='center'
                  key={`h${n}`}
                  style={{
                    minWidth: 100 ,
                    zIndex: 800,}}
                >
                  {c.name}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody >
            {results.summaryData.preferenceMatrix.map((row, i) => (
              <TableRow key={i}>
                <TableCell
                  style={{
                    position: 'sticky',
                    left: 0,
                    background: 'white',
                    zIndex: 700,
                  }}
                  align='center'>
                  {results.summaryData.candidates[i].name}
                </TableCell>
                {row.map((col, j) => (
                  results.summaryData.pairwiseMatrix[i][j] === 1 ?
                    <TableCell
                      className='highlight'
                      key={`c${i},${j}`}
                      align='center'>
                      <CellViewer cell={col} />
                    </TableCell>
                    :
                    <TableCell
                      key={`c${i},${j}`}
                      align='center'>
                      <CellViewer cell={col} />
                    </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
  );
}
