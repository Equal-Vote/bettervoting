import { TableContainer } from "@mui/material";

interface ResultsTableProps {
  className?: string;
  data: (string | number)[][];
  winningRows?: number;
}

const ResultsTable = ({ className='', data, winningRows=1 }: ResultsTableProps) => {
  const c = `resultTable ${className}`;
  const winningStyle = { backgroundColor: 'var(--brand-gold'}

  return (
    <TableContainer
      sx={{
        marginLeft: "auto",
        marginRight: "auto",
        maxHeight: 600,
        width: "100%",
      }}
    >
      <table className={c} style={{minWidth: '100%'}}>
        <thead className={c}>
          <tr>
            {data[0].map((header, i) => (
              <th key={i} className={c} style={{minWidth: i == 0 ? '125px' : '75px'}} >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(1).map((row, i) => (
            <tr className={c} key={i} style={i < winningRows ? winningStyle : {}}>
              {row.map((value, j) => (
                <td
                  key={j}
                  className={c}
                  style={{
                    paddingLeft: j == 0 ? "8px" : "0",
                  }}
                >
                  {typeof value === "number" ? Math.round(100 * value) / 100 : value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </TableContainer>
  );
};

export default ResultsTable;