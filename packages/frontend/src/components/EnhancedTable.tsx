/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, ReactNode, MouseEvent, ChangeEvent } from 'react';
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import { makeChipStyle } from './ElectionForm/Details/ElectionStateChip';
import { visuallyHidden } from '@mui/utils';
import { epochToDateString, getLocalTimeZoneShort, NumberObject, useSubstitutedTranslation } from './util';
import { Checkbox, FormControl, ListItemText, MenuItem, Select, TextField, Chip } from '@mui/material';
import { ElectionState } from '@equal-vote/star-vote-shared/domain_model/Election';
import Link from "@mui/material/Link";

export type HeadKey = keyof typeof headCellPool;

type Order = 'asc' | 'desc';

interface TableData {
  [key: string]: string | number
}

interface EnhancedTableToolbarProps {
  numSelected: number;
  tableTitle: string;
}

interface HeadCell {
  disablePadding: boolean;
  id: keyof TableData;
  label: string;
  numeric: boolean;
  isDate?: boolean;
  filterType?: 'search' | 'groups';
  filterGroups?: {
    [key: string]: boolean
  };
  formatter?: (value: string, row?: string, t?: (key: string, options?: object) => string) => ReactNode;
}

interface EnhancedTableHeadProps {
  onRequestSort: (event: MouseEvent<unknown>, property: keyof TableData) => void;
  order: Order;
  orderBy: string;
  headCells: HeadCell[];
  filters: string[];
  setFilters: (filtersUpdater: (filters: string[]) => string[]) => void
}

const headCellPool = {
  voter_id: {
    id: 'voter_id',
    numeric: false,
    disablePadding: false,
    label: 'Voter ID',
    filterType: 'search',
    formatter: a => a,
  },
  message: {
    id: 'message',
    numeric: false,
    disablePadding: false,
    label: 'Message',
    filterType: 'search',
    formatter: a => a,
  },
  email: {
    id: 'email',
    numeric: false,
    disablePadding: false,
    label: 'Email',
    filterType: 'search',
    formatter: a => a || '',
  },
  file_name: {
    id: 'file_name',
    numeric: false,
    disablePadding: false,
    label: 'File Name',
    filterType: 'search',
    formatter: a => a || '',
  },
  election_id: {
    id: 'election_id',
    numeric: false,
    disablePadding: false,
    label: 'Election ID',
    filterType: 'search',
    formatter: a => a ? <Link href={`${window.location.origin}/${a}/results`}>{a}</Link> : '(new election)',
  },
  invite_status: {
    id: 'invite_status',
    numeric: false,
    disablePadding: false,
    label: 'Email Invites',
    filterType: 'groups',
    filterGroups: {
      'Not Sent': true,
      'Sent': true,
      'Failed': true,
    },
    formatter: (_, roll) => {
      if (!roll?.email_data?.inviteResponse) return 'Not Sent';
      if (roll.email_data.inviteResponse.length == 0 || roll.email_data.inviteResponse[0].statusCode >= 400) return 'Failed'
      return 'Sent'
    }
  },
  upload_status: {
    id: 'upload_status',
    numeric: false,
    disablePadding: false,
    label: 'Upload Status',
    filterType: 'groups',
    filterGroups: {
      'Pending': true,
      'In Progress': true,
      'Error': true,
      'Done': true,
    },
    formatter: a => a
  },
  has_voted: {
    id: 'has_voted',
    numeric: false,
    disablePadding: false,
    label: 'Has Voted',
    filterType: 'groups',
    filterGroups: {
      'Not Voted': true,
      'Voted': true,
    },
    formatter: (_, roll) => roll.submitted ? 'Voted' : 'Not Voted',
  },
  voter_state: {
    id: 'voter_state',
    numeric: false,
    disablePadding: false,
    label: 'State',
    filterType: 'groups',
    filterGroups: {
      approved: true,
      registered: true,
    },
    formatter: (_, roll) => roll.state.toString(),
  },
  precinct: {
    id: 'precinct',
    numeric: false,
    disablePadding: false,
    label: 'Precinct',
    filterType: 'search',
    formatter: a => a || '',
  },
  ip: {
    id: 'ip',
    numeric: false,
    disablePadding: false,
    label: 'IP',
    filterType: 'search',
    formatter: (_, roll) => roll.ip_hash || '',
  },
  title: {
    id: 'title',
    numeric: false,
    disablePadding: false,
    label: 'Election Title',
    filterType: 'search',
    formatter: (title, election) => <>{title}&nbsp;<a href={`/${election.election_id}`}>🔗</a></>
  },
  roles: {
    id: 'roles',
    numeric: false,
    disablePadding: false,
    label: 'Role',
    filterType: 'search',
    formatter: a => a
  },
  election_state: {
    id: 'election_state',
    numeric: false,
    disablePadding: false,
    label: 'State',
    filterType: 'groups',
    filterGroups: {
      draft: true,
      finalized: true,
      open: true,
      closed: true,
      archived: false
    },
    formatter: (_, election) => {
      return election.state || ''
    }
  },
  create_date: {
    id: 'create_date',
    numeric: false,
    disablePadding: false,
    label: `Create Date (${getLocalTimeZoneShort()})`,
    filterType: 'search',
    isDate: true,
    formatter: (time, election, t) => t('listed_datetime', { listed_datetime: time })
  },
  update_date: {
    id: 'update_date',
    numeric: false,
    disablePadding: false,
    label: `Last Updated (${getLocalTimeZoneShort()})`,
    filterType: 'search',
    isDate: true,
    // NOTE: not sure why update time is an epoch while everything else is tring 🤷
    formatter: (time, election, t) => t('listed_datetime', { listed_datetime: epochToDateString(time) })
  },
  start_time: {
    id: 'start_time',
    numeric: false,
    disablePadding: false,
    label: `Start Time (${getLocalTimeZoneShort()})`,
    filterType: 'search',
    isDate: true,
    formatter: (time, election, t) => time ? t('listed_datetime', { listed_datetime: time }) : ''
  },
  end_time: {
    id: 'end_time',
    numeric: false,
    disablePadding: false,
    label: `End Time (${getLocalTimeZoneShort()})`,
    filterType: 'search',
    isDate: true,
    formatter: (time, election, t) => time ? t('listed_datetime', { listed_datetime: time }) : ''
  },
  description: {
    id: 'description',
    numeric: false,
    disablePadding: false,
    label: 'Election Description',
    filterType: 'search',
    formatter: descr => limit(descr, 30)
  },
  owner_id: {
    id: 'owner_id',
    numeric: false,
    disablePadding: false,
    label: 'Owner ID',
    filterType: 'search',
    formatter: id => <>
      {id.startsWith('v-') && '(no account)'}
      {!id.startsWith('v-') && <a target='_blank' href={`https://keycloak.prod.equal.vote/admin/master/console/#/Prod/users/${id}/settings`}>{limit(id, 6)}</a>}
    </>
  },
  votes: {
    id: 'votes',
    numeric: true,
    disablePadding: false,
    label: 'Votes',
    filterType: 'search',
    formatter: (_, election, __, voteCounts) => Number(voteCounts[election.election_id] ?? 0)
  },
}

interface EnhancedTableProps {
  title: string,
  headKeys: HeadKey[]
  data: any[] // we'll use a formatter to convert it to TableData
  voteCounts?: NumberObject,
  defaultSortBy: Extract<keyof TableData, string>
  handleOnClick: Function
  isPending: boolean
  pendingMessage: string,
  emptyContent: any,
}

const limit = (string = '', limit = 0) => {
  if (!string) return ''
  return string.substring(0, limit)
}

function descendingComparator<T>(a: T, b: T, orderBy: keyof T, isDate: boolean) {
  if (isDate) {
    // Table data is already formatted at this point, so date strings have to be converted back to date objects in order to sort. 
    // Should be a temp fix until I can fix the formatting to occur after sorting and filtering. 
    // If you see this comment, I have failed.
    if (new Date(b[orderBy] as string).getTime() < new Date(a[orderBy] as string).getTime()) {
      return -1;
    }
    if (new Date(b[orderBy] as string).getTime() > new Date(a[orderBy] as string).getTime()) {
      return 1;
    }
  }
  if ('string' === typeof b[orderBy] && 'string' === typeof a[orderBy]) {
    const alc = a[orderBy].toLowerCase();
    const blc = b[orderBy].toLowerCase();
    if (blc < alc) {
      return -1;
    }
    if (blc > alc) {
      return 1;
    }
    return 0;
  }
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

function getComparator<Key extends keyof any>(
  order: Order,
  orderBy: Key,
  isDate: boolean,
): (
  a: { [key in Key]: number | string },
  b: { [key in Key]: number | string },
) => number {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy, isDate)
    : (a, b) => -descendingComparator(a, b, orderBy, isDate);
}

// Since 2020 all major browsers ensure sort stability with Array.prototype.sort().
// stableSort() brings sort stability to non-modern browsers (notably IE11). If you
// only support modern browsers you can replace stableSort(exampleArray, exampleComparator)
// with exampleArray.slice().sort(exampleComparator)
function stableSort<T>(array: readonly T[], comparator: (a: T, b: T) => number) {
  const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) {
      return order;
    }
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

// type filterTypes = 'search' | 'groups' | null

function filterData<T>(array: readonly T[], headCells: HeadCell[], filters: any[]) {
  // when tweaking the headKeys the filters and headCells can sometimes be temporarily mismatched
  if (headCells.length != filters.length) return array;
  return array.filter(row => {
    return headCells.every((col, colInd) => {
      if (!col.filterType) return true
      if (col.filterType === 'search') {
        if (filters[colInd] == '') return true
        return row[col.id].toLowerCase().includes(filters[colInd].toLowerCase())
      }
      if (col.filterType === 'groups') {
        return filters[colInd][row[col.id]]
      }
      return true
    })
  })
}

function EnhancedTableHead(props: EnhancedTableHeadProps) {
  const { order, orderBy, onRequestSort } = props;

  const createSortHandler =
    (property: keyof TableData) => (event: MouseEvent<unknown>) => {
      onRequestSort(event, property);
    };

  const handleSearchFilterChange = (ind: number, value: string) => {
    props.setFilters(filters => {
      const newFilters = [...filters]
      newFilters[ind] = value
      return newFilters
    })
  }

  const handleGroupFilterChange = (ind: number, value: string[]) => {
    props.setFilters(filters => {
      const newFilters: ElectionState[] = [...filters as ElectionState[]];
      // Update the filter groups based on the selected values
      Object.keys(newFilters[ind]).forEach(group => {
        newFilters[ind][group] = value.includes(group);
      });
      return newFilters as ElectionState[];
    });
  };

  return (
    <TableHead>
      <TableRow>
        {props.headCells.map((headCell, cellInd) => (
          <TableCell
            key={headCell.id}
            align={headCell.numeric ? 'right' : 'left'}
            padding={headCell.disablePadding ? 'none' : 'normal'}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : 'asc'}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
              {orderBy === headCell.id ? (
                <Box component="span" sx={visuallyHidden}>
                  {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                </Box>
              ) : null}
            </TableSortLabel>
            {headCell.filterType === 'search' &&
              <TextField
                sx={{ my: 1, minWidth: 120 }}
                size="small"
                value={props.filters[cellInd]}
                onChange={(e) => handleSearchFilterChange(cellInd, e.target.value)}
                placeholder='Search'
              />
            }
            {headCell.filterType === 'groups' &&
              // <FormControl
              //   sx={{ my: 1, width: 120 }} size="small"
              // >
              //   <Select
              //     multiple
              //     value={Object.keys(props.filters[cellInd]).filter(group => props.filters[cellInd][group])}
              //     renderValue={(selected) => selected.join(', ')}
              //   >
              //     {Object.keys(headCell.filterGroups).map((group, i) => (
              //       <MenuItem 
              //         onClick={(e) => handleGroupFilterChange(cellInd, group, !props.filters[cellInd][group])}
              //         key={`group-${i}`}
              //       >
              //         <Checkbox
              //           checked={props.filters[cellInd][group] == true}
              //         />
              //         <ListItemText primary={group} />
              //       </MenuItem>
              //     ))}
              //   </Select>
              // </FormControl>
              <FormControl sx={{ my: 1, width: 130 }} size="small">
                <Select
                  multiple
                  value={Object.keys(props.filters[cellInd]).filter(group => props.filters[cellInd][group]) as (| ElectionState)[]}
                  onChange={(e) => handleGroupFilterChange(cellInd, e.target.value as ("" | ElectionState)[])}
                  renderValue={(selected: ("" | ElectionState)[]) => (
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {selected.map((value: "" | ElectionState) => (
                        <Chip key={value} label={''} sx={makeChipStyle(value)} />
                      ))}
                    </Box>
                  )}
                >
                  {Object.keys(headCell.filterGroups).map((group, i) => (
                    <MenuItem key={`group-${i}`} value={group}>
                      <Checkbox checked={props.filters[cellInd][group] == true} />
                      <ListItemText primary={group} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            }
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

function EnhancedTableToolbar(props: EnhancedTableToolbarProps) {
  const { numSelected } = props;

  return (
    <Toolbar
      sx={{
        pl: { sm: 2 },
        pr: { xs: 1, sm: 1 },
        ...(numSelected > 0 && {
          bgcolor: (theme) =>
            alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
        }),
      }}
    >

      <Typography
        sx={{ flex: '1 1 100%' }}
        variant="h6"
        id="tableTitle"
        component="div"
      >
        {props.tableTitle}
      </Typography>
    </Toolbar>
  );
}



export default function EnhancedTable(props: EnhancedTableProps) {
  const [order, setOrder] = useState<Order>(props.defaultSortBy == 'email' ? 'asc' : 'desc');
  const [orderBy, setOrderBy] = useState<Extract<keyof TableData, string>>(props.defaultSortBy);
  const [selected] = useState<readonly string[]>([]);
  const [page, setPage] = useState(0);
  const [dense] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const headCells: HeadCell[] = props.headKeys.map(key => headCellPool[key] as HeadCell);
  const { t } = useSubstitutedTranslation();
  const [filters, setFilters] = useState([])

  if (filters.length != headCells.length) {
    setFilters(headCells.map(col => {
      if (!col.filterType) {
        return null
      }
      else if (col.filterType === 'groups') {
        return (col as HeadCell).filterGroups
      }
      else if (col.filterType === 'search') {
        return ''
      }
    }))
  }

  const handleRequestSort = (
    event: MouseEvent<unknown>,
    property: Extract<keyof TableData, string>,
  ) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // const handleChangeDense = (event: ChangeEvent<HTMLInputElement>) => {
  //   setDense(event.target.checked);
  // };

  const formatTableData = (headKeys, data, voteCounts) => {
    const fData = data.map(item => {
      const fItem = {};
      // include voter_id as a hack so that it will be available in the callback
      ['voter_id', ...headKeys].forEach(key => {
        fItem[key] = key in headCellPool ? headCellPool[key].formatter(item[key], item, t, voteCounts) : item[key];
      });
      fItem['raw'] = item;
      return fItem;
    });
    return fData;
  }

  const filteredRows = useMemo(
    () => {
      setPage(0);
      return filterData(formatTableData(props.headKeys, props.data, props.voteCounts ?? {}), headCells, filters);
    },
    [filters, props.data],
  );

  // Avoid a layout jump when reaching the last page with empty rows.
  const emptyRows =
    page > 0 ? Math.max(0, (1 + page) * rowsPerPage - filteredRows.length) : 0;


  const visibleRows = useMemo(
    () =>
      stableSort(filteredRows, getComparator(order, orderBy, headCellPool[orderBy].isDate === true)).slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage,
      ),
    [order, orderBy, page, rowsPerPage, filteredRows],
  );


  return (
    <Container>
      <Box
        display='flex'
        justifyContent="center"
        alignItems="center"
        flexDirection="column"
        sx={{ pt: 2, width: '100%' }}>
        {props.isPending && <Typography align='center' variant="h3" component="h2"> {props.pendingMessage} </Typography>}
        {!props.isPending && <Paper elevation={8} sx={{ width: '100%', mb: 2 }}>
          <EnhancedTableToolbar numSelected={selected.length} tableTitle={props.title} />
          <TableContainer>
            <Table
              sx={{ minWidth: 750 }}
              aria-labelledby="tableTitle"
              size={dense ? 'small' : 'medium'}
            >
              <EnhancedTableHead
                order={order}
                orderBy={orderBy}
                onRequestSort={handleRequestSort}
                headCells={headCells}
                filters={filters}
                setFilters={setFilters}
              />
              <TableBody>
                {visibleRows.map((row, index) => {
                  const labelId = `enhanced-table-checkbox-${index}`;
                  return (
                    <TableRow
                      hover
                      onClick={() => props.handleOnClick(row)}
                      tabIndex={-1}
                      key={labelId}
                      sx={{ cursor: 'pointer' }}
                    >
                      {headCells.map((col, colInd) => {
                        //const isElectionState = col.id === 'election_state';
                        const groupFilter = col.filterType == 'groups';
                        if (colInd == 0) {
                          return <TableCell
                            component="th"
                            id={labelId}
                            key={`${labelId}-${colInd}`}
                            scope="row">
                            {row[col.id]}
                          </TableCell>
                        } else {
                          return <TableCell
                            align={col.numeric ? 'right' : 'left'}
                            key={`${labelId}-${colInd}`}
                          >
                            {groupFilter ? <Chip label={row[col.id]} sx={makeChipStyle(row[col.id])} /> : row[col.id]}
                          </TableCell>
                        }
                      }
                      )}
                    </TableRow>
                  );
                })}
                {emptyRows > 0 && (
                  <TableRow
                    style={{
                      height: (dense ? 33 : 53) * emptyRows,
                    }}
                  >
                    <TableCell colSpan={6} />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 100]}
            component="div"
            count={filteredRows.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>}
      </Box>
    </Container>
  );
}
