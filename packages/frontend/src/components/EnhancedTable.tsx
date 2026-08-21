/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect, ReactNode, MouseEvent, ChangeEvent } from 'react';
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
import { Button, Checkbox, FormControl, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Select, TextField, Chip, Tooltip } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import CloseIcon from '@mui/icons-material/Close';
import { ElectionState } from '@equal-vote/star-vote-shared/domain_model/Election';
import Link from "@mui/material/Link";
import { describeHistoryEvent, formatHistoryTimestamp, historyChipLabel, historyFilterGroups } from './Election/electionHistoryFormat';

export type HeadKey = keyof typeof headCellPool;

type Order = 'asc' | 'desc';

interface TableData {
  [key: string]: string | number
}

// An entry in the toolbar's Actions menu, shown once rows are selected.
// onAction receives the selected rows (the formatted rows, so the underlying
// record is on row.raw) and may be async — the menu stays disabled until it settles.
export interface BulkAction {
  key: string;
  label: string;
  icon?: ReactNode;
  onAction: (rows: any[]) => void | Promise<void>;
}

interface EnhancedTableToolbarProps {
  numSelected: number;
  tableTitle: string;
  actions?: { key: string, label: string, icon?: ReactNode, run: () => void }[];
  onClearSelection?: () => void;
  actionsPending?: boolean;
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
  selectable?: boolean;
  allOnPageSelected?: boolean;
  someOnPageSelected?: boolean;
  onSelectAllOnPage?: (event: ChangeEvent<HTMLInputElement>) => void;
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
      {!id.startsWith('v-') && <a target='_blank' href={`https://keycloak.prod.equal.vote/admin/master/console/#/Prod/users/${id}/settings`} rel="noreferrer">{limit(id, 6)}</a>}
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
  history_event: {
    id: 'history_event',
    numeric: false,
    disablePadding: false,
    label: 'Event',
    filterType: 'groups',
    filterGroups: historyFilterGroups(),
    formatter: (_, event) => historyChipLabel(event.type),
  },
  history_description: {
    id: 'history_description',
    numeric: false,
    disablePadding: false,
    label: 'Description',
    filterType: 'search',
    formatter: (_, event, t) => describeHistoryEvent(event, t),
  },
  history_when: {
    id: 'history_when',
    numeric: false,
    disablePadding: false,
    // Deliberately not isDate: the formatted value is already lexicographically
    // sortable, which keeps the ordering correct in every locale.
    label: 'When (UTC)',
    filterType: 'search',
    formatter: (_, event) => formatHistoryTimestamp(event),
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
  // Row selection is opt-in: a table only grows checkboxes when it passes both
  // bulkActions and getRowId. Without that the other tables sharing this component
  // (public archive, elections you voted in, ...) would sprout checkboxes with
  // nothing to do.
  bulkActions?: BulkAction[],
  getRowId?: (row: any) => string,
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
        let item = row[col.id];
        // if it's not a string, assume it's a ReactNode and strip away the noise
        if(typeof item !== 'string') item = row[col.id].props.children[0]
        return item.toLowerCase().includes(filters[colInd].toLowerCase())
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
        {props.selectable &&
          <TableCell padding="checkbox" sx={{ verticalAlign: 'top', pt: 2 }}>
            <Checkbox
              color="primary"
              indeterminate={props.someOnPageSelected && !props.allOnPageSelected}
              checked={props.allOnPageSelected}
              onChange={props.onSelectAllOnPage}
              slotProps={{ input: { 'aria-label': 'select all rows on this page' } }}
            />
          </TableCell>
        }
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
  const { t } = useSubstitutedTranslation();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const hasActions = numSelected > 0 && (props.actions?.length ?? 0) > 0;

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

      {hasActions ?
        <>
          <Typography
            sx={{ flex: '1 1 100%' }}
            color="inherit"
            variant="subtitle1"
            component="div"
          >
            {t('bulk_actions.selected', { count: numSelected })}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            sx={{ whiteSpace: 'nowrap' }}
            disabled={props.actionsPending}
            endIcon={<ArrowDropDownIcon />}
            aria-haspopup="menu"
            onClick={(e) => setMenuAnchor(e.currentTarget)}
          >
            {t('bulk_actions.menu_button')}
          </Button>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            {props.actions.map(action =>
              <MenuItem
                key={action.key}
                onClick={() => { setMenuAnchor(null); action.run(); }}
              >
                {action.icon && <ListItemIcon>{action.icon}</ListItemIcon>}
                <ListItemText>{action.label}</ListItemText>
              </MenuItem>
            )}
          </Menu>
          <Tooltip title={t('bulk_actions.clear')}>
            <span>
              <IconButton
                size="small"
                sx={{ ml: 1 }}
                disabled={props.actionsPending}
                aria-label={t('bulk_actions.clear')}
                onClick={props.onClearSelection}
              >
                <CloseIcon />
              </IconButton>
            </span>
          </Tooltip>
        </>
        :
        <Typography
          sx={{ flex: '1 1 100%' }}
          variant="h6"
          id="tableTitle"
          component="div"
        >
          {props.tableTitle}
        </Typography>
      }
    </Toolbar>
  );
}



export default function EnhancedTable(props: EnhancedTableProps) {
  const [order, setOrder] = useState<Order>(props.defaultSortBy == 'email' ? 'asc' : 'desc');
  const [orderBy, setOrderBy] = useState<Extract<keyof TableData, string>>(props.defaultSortBy);
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [actionsPending, setActionsPending] = useState(false);
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

  const selectable = Boolean(props.bulkActions?.length && props.getRowId);
  const getRowId = props.getRowId ?? (() => '');
  const columnCount = headCells.length + (selectable ? 1 : 0);

  // A selected row that a filter has since hidden must not stay actionable — otherwise
  // "Archive 12" could reach rows the user can no longer see.
  useEffect(() => {
    if (!selectable) return;
    const stillPresent = new Set(filteredRows.map(row => getRowId(row)));
    setSelected(prev => {
      const next = prev.filter(id => stillPresent.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [filteredRows, selectable]);

  const selectedRows = useMemo(
    () => selectable ? filteredRows.filter(row => selected.includes(getRowId(row))) : [],
    [filteredRows, selected, selectable],
  );

  // "Select all" is scoped to the current page — the rows actually on screen.
  const visibleIds = useMemo(() => visibleRows.map(row => getRowId(row)), [visibleRows, selectable]);
  const numSelectedOnPage = visibleIds.filter(id => selected.includes(id)).length;

  const handleSelectAllOnPage = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(prev => Array.from(new Set([...prev, ...visibleIds])));
    } else {
      setSelected(prev => prev.filter(id => !visibleIds.includes(id)));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(other => other !== id) : [...prev, id]);
  };

  const toolbarActions = (props.bulkActions ?? []).map(action => ({
    key: action.key,
    label: action.label,
    icon: action.icon,
    run: async () => {
      setActionsPending(true);
      try {
        await action.onAction(selectedRows);
      } finally {
        setActionsPending(false);
        setSelected([]);
      }
    },
  }));


  return (
    <Container>
      <Box sx={{ pt: 2, width: '100%', display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
        {props.isPending && <Typography align='center' variant="h3" component="h2"> {props.pendingMessage} </Typography>}
        {!props.isPending && <Paper elevation={8} sx={{ width: '100%', mb: 2 }}>
          <EnhancedTableToolbar
            numSelected={selectedRows.length}
            tableTitle={props.title}
            actions={toolbarActions}
            actionsPending={actionsPending}
            onClearSelection={() => setSelected([])}
          />
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
                selectable={selectable}
                allOnPageSelected={visibleIds.length > 0 && numSelectedOnPage === visibleIds.length}
                someOnPageSelected={numSelectedOnPage > 0}
                onSelectAllOnPage={handleSelectAllOnPage}
              />
              <TableBody>
                {visibleRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columnCount} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        {props.emptyContent}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {visibleRows.map((row, index) => {
                  const labelId = `enhanced-table-checkbox-${index}`;
                  const rowId = getRowId(row);
                  const isSelected = selectable && selected.includes(rowId);
                  return (
                    <TableRow
                      hover
                      onClick={() => props.handleOnClick(row)}
                      tabIndex={-1}
                      key={labelId}
                      selected={isSelected}
                      sx={{ cursor: 'pointer' }}
                    >
                      {selectable &&
                        // The whole row is a link to the election, so the checkbox has to
                        // swallow the click or ticking a box navigates away from the list.
                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            color="primary"
                            checked={isSelected}
                            onChange={() => handleToggleRow(rowId)}
                            slotProps={{ input: { 'aria-labelledby': labelId } }}
                          />
                        </TableCell>
                      }
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
                    <TableCell colSpan={columnCount} />
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
