import { Box, Button, Divider, FormControlLabel, Link, TextField, Typography } from "@mui/material";
import { DateTime } from "luxon";
import { useTranslation } from "react-i18next";
import { SecondaryButton, Tip } from "./styles";
import i18n from "~/i18n/i18n";
import useSnackbar from "./SnackbarContext";
import { AddCircleOutlineRounded, ArrowForwardIos } from "@mui/icons-material";
import { getEntry } from "@equal-vote/star-vote-shared/domain_model/Util";
import { createHash } from "crypto-browserify";
import RemoveCircleOutlineRoundedIcon from '@mui/icons-material/RemoveCircleOutlineRounded';
import { useEffect, useState } from "react";

const rLink = /\[(.*?)\]\((.*?)\)/;
const rBold = /\*\*(.*?)\*\*/;
const rTip = / !tip\((.*)\)/;

export const AddIcon = ({prefix=false}) => <AddCircleOutlineRounded sx={{mr: (prefix? 1 : 0)}}/>
export const MinusIcon = ({prefix=false}) => <RemoveCircleOutlineRoundedIcon sx={{mr: (prefix? 1 : 0)}}/>

export type StringObject = {[key: string]: string};
export type NumberObject = {[key: string]: number};

//I don't know how to fix this, but eslint doesn't like namespace
// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace Intl {
  class ListFormat {
    constructor(locales?: string | string[], options?: object);
    public format: (items: string[]) => string;
  }
  class DateTimeFormat {
    constructor(tz?: string, options?: object);
    public format: (item: DateTime) => string;
  }
}

export const TransitionBox = ({enabled, sx={}, absolute=false, children}) => {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if(enabled) return

    setExiting(true)
    setTimeout(() => setExiting(false), 400);
  }, [enabled])

  return <Box sx={{
    opacity: enabled ? 1 : 0,
    top: enabled ? 0 : (exiting ? -20 : 20),
    pointerEvents: enabled ? 'auto' : 'none',
    transition: 'opacity 0.2s, top 0.2s',
    position: absolute? 'absolute' : 'relative',
    width: '100%',
    ...sx,
  }}> {children} </Box>
}

// converts the candiate from ITabulator.ts to (capital C) Candidate
// this will eventually be unnecessary (see #878)
export const tabToCandidate = (c, raceCandidates) => ({
  candidate_id: getEntry(raceCandidates, c.name, 'candidate_name').candidate_id,
  candidate_name: c.name
})

export const commaListFormatter = new Intl.ListFormat(i18n.languages[0], { style: 'long', type: 'conjunction' });

export const capitalize = (str = '') =>
  String(str)
    .split(' ')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');

// Note: it feels weird to have the same util function on both frontend and backend instead of using shared, but they need to use different libraries
export function hashString(inputString: string) {
    return createHash('sha256').update(inputString).digest('hex')
}

// mapping from method frontend version to backend version
// TODO: we need make these consistent
export const methodValueToTextKey = {
    STAR_PR: 'star_pr',
    STAR: 'star',
    RankedRobin: 'ranked_robin',
    Approval: 'approval',
    STV: 'stv',
    Plurality: 'choose_one',
    IRV: 'rcv',
};

export const formatPercent = (f: number): string => {
  if(0 < f && f < .01) return '<1%';
  return `${Math.round(100*f)}%`
}

export const MailTo = ({ children }: { children: string }) => {
  const { setSnack } = useSnackbar();
  // https://adamsilver.io/blog/the-trouble-with-mailto-email-links-and-what-to-do-instead/
  return <span style={{ whiteSpace: 'nowrap' }}>
    <Link href={`mailto:${children}`} sx={{ color: 'var(--brand-pop)' }}>{children}</Link>
    <SecondaryButton
      onClick={() => {
        navigator.clipboard.writeText(children)
        setSnack({
          message: 'Email Copied!',
          severity: 'success',
          open: true,
          autoHideDuration: 6000,
        })
      }}
      sx={{ minWidth: 0, ml: 1, px: 1, py: 0}}
    >Copy</SecondaryButton>
  </span>
}

interface RowButtonWithArrowProps {
  title: string;
  description?: string;
  onClick: () => void;
  ariaLabel?: string;
}
export const RowButtonWithArrow = ({ title, description = undefined, onClick, ariaLabel }: RowButtonWithArrowProps) => <>
  <Button
    color='inherit'
    fullWidth
    className='startingOption'
    sx={{ justifyContent: 'flex-start', textTransform: 'inherit' }}
    onClick={onClick}
    aria-label={ariaLabel}
  >
    <Box sx={{
      width: '100%',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      my: description ? 'inherit' : 2
    }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
        <Typography variant="body1">{title}</Typography>
        {description && <Typography color='gray' variant="body2">{description.split('. ').map(sentence => <>{`${sentence}.`}<br /></>)}</Typography>}
      </Box>
      <ArrowForwardIos className="startingOptionArrow" sx={{ transition: 'padding-left .2s' }} />
    </Box>
  </Button>
  <Divider />
</>
interface LabelledTextFieldProps {
  label: string;
  value: string | number;
  setter: (value: string) => void;
  fullWidth?: boolean;
  rows?: number;
  helperText?: string;
}
// defining in separate file: https://stackoverflow.com/questions/58778631/react-input-loses-focus-on-keypress
export const LabelledTextField = ({ label, value, setter, fullWidth = false, rows = 1, helperText }: LabelledTextFieldProps) =>
  <FormControlLabel control={
    <TextField
      value={value}
      onChange={(e) => setter(e.target.value)}
      sx={{ display: 'block' }}
      multiline={rows > 1}
      rows={rows}
      fullWidth
      helperText={helperText}
    />
  }
    label={label}
    labelPlacement='top'
    sx={{
      alignItems: 'start',
      width: { xs: (fullWidth) ? '90%' : 'unset', md: (fullWidth) ? '90%' : '400px' }
    }}
  />



// NOTE: I'm setting a electionTermType default for backwards compatibility with elections that don't have a term set
export const useSubstitutedTranslation = (electionTermType = 'election', v = {}) => { // election or poll
  const processValues = (values) => {
    Object.entries(values).forEach(([key, value]) => {
      if (typeof value === 'string') {
        if (key == 'datetime' || key == 'datetime2' || key == 'listed_datetime') {
          values[key] = new Date(value)
        } else if (value.length > 2) {
          values[`capital_${key}`] = capitalize(value)
        }
      }
      if (Array.isArray(value)) {
        values[key] = commaListFormatter.format(value);
      }
    })
    return values
  }

  const dt = {
    year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric',
    timeZoneName: 'short', timeZone: v['time_zone'] ?? undefined
  }


  const { t, i18n } = useTranslation()

  const values = processValues({
    // Ignoring "error TS2698: Spread types may only be created from object types." since we know they'll return objects
    // @ts-ignore
    ...t('keyword'),
    // @ts-ignore
    ...t(`keyword.${electionTermType}`),
    // @ts-ignore
    ...t(`keyword.${v['methodKey'] ?? 'star'}`),
    ...v, formatParams: {
      datetime: dt,
      datetime2: dt,
      listed_datetime: {
        year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
        timeZoneName: undefined, timeZone: v['time_zone'] ?? undefined
      },
    }
  })

  const applySymbols = (txt, includeTips, newWindow) => {
    const applyLinks = (txt) => {
      if (typeof txt !== 'string') return txt;
      const parts = txt.split(rLink)
      return parts.map((str, i) => {
        if (i % 3 == 0) return str;
        if (i % 3 == 2) return '';
        if (parts[i + 1].startsWith('mailto')) {
          return <MailTo key={`link_${i}`}>{parts[i]}</MailTo>
        } else {
          return <a key={`link_${i}`} href={parts[i + 1]} target={newWindow ? '_blank' : '_self'} rel={newWindow ? 'noreferrer' : undefined}>{parts[i]}</a>
        }
      })
    }

    const applyBold = (txt, keyPrefix) => {
      if (typeof txt !== 'string') return txt;
      return txt.split(rBold).map((str, i) => {
        if (i % 2 == 0) return str
        return <i key={`b_${keyPrefix}_${i}`}>{str}</i>;
      })
    }

    const applyTips = (txt, keyPrefix, includeTips) => {
      if (typeof txt !== 'string') return txt;
      return txt.split(rTip).map((str, i) => {
        if (i % 2 == 0) return str;
        if (!includeTips) return '';
        return <Tip key={`tip_${keyPrefix}_${i}`} name={str} />
      })
    }

    const applyLineBreaks = (txt, keyPrefix) => {
      if (typeof txt !== 'string') return txt;
      const parts = txt.split('\n');
      return parts.map((part, i) => i == (parts.length - 1) ? part : [part, <br key={`br_${keyPrefix}_${i}`} />]).flat();
    }

    // hack for testing if we've missed any text
    // return '----'; 

    if (!rLink.test(txt) && !rTip.test(txt) && !txt.includes('\n') && !rBold.test(txt)) return txt;

    const output = applyLinks(txt)
        .map((comp, i) => applyTips(comp, i, includeTips)).flat()
        .map((comp, i) => applyLineBreaks(comp, i)).flat()
        .map((comp, i) => applyBold(comp, i)).flat()
    if(output.every(item => typeof item === 'string' )){
      return output.join('')
    }else{
      return <>{output}</>
    }
  }

  const handleObject = (obj, includeTips=true, newWindow=false, skipProcessing=false) => {
    if (skipProcessing) return obj;
    if (typeof obj == 'number') return obj;
    if (typeof obj === 'string') return applySymbols(obj, includeTips, newWindow);
    if (Array.isArray(obj)) return obj.map(o => handleObject(o, includeTips, newWindow));

    const newObj = {};
    Object.entries(obj).forEach(([key, value]) => {
      newObj[key] = handleObject(value, includeTips, newWindow);
    })
    return newObj;
  }
  
  return {
    t: (key, v = {}) => handleObject(t(key, { ...values, ...processValues(v) }), v['includeTips'], v['newWindow'], v['skipProcessing']),
    i18n,
  }
}

export const CHART_COLORS = [
  "var(--ltbrand-blue)",
  "var(--ltbrand-green)",
  "var(--ltbrand-lime)",
];

export const truncName = (name, maxSize) => {
  if (!(typeof name === 'string')) return name;
  if (name.length <= maxSize) return name;
  return name.slice(0, maxSize - 3).concat("...");
};

export const openFeedback = () => {
  // simulate clicking the feedback button
  const launcherFrame = document.getElementById("launcher-frame");
  const button =
    (launcherFrame as HTMLIFrameElement).contentWindow.document.getElementsByClassName(
      "launcher-button"
    )[0];
  (button as HTMLButtonElement).click();
};




export function scrollToElement(e) {
  setTimeout(() => {
    // TODO: I feel like there's got to be an easier way to do this
    let openedSection = typeof e === "function" ? e() : e;

    if (Object.prototype.isPrototypeOf.call(NodeList.prototype, openedSection)) {
      // NOTE: NodeList could contain a bunch of hidden elements with height 0, so we're filtering those out
      openedSection = Array.from(openedSection).filter((e) => {
        const box = (e as HTMLElement).getBoundingClientRect();
        return box.bottom - box.top > 0;
      });
      if (openedSection.length == 0) return;
      openedSection = openedSection[0];
    }

    const navBox = document.querySelector("header").getBoundingClientRect();
    const navHeight = navBox.bottom - navBox.top;

    const elemTop =
      document.documentElement.scrollTop +
      openedSection.getBoundingClientRect().top -
      30;
    const elemBottom = elemTop + openedSection.scrollHeight;
    const windowTop = document.documentElement.scrollTop;
    const windowBottom = windowTop + window.innerHeight;

    if (elemTop < windowTop || elemBottom > windowBottom) {
      window.scrollTo({
        top: elemTop - navHeight,
        behavior: "smooth",
      });
    }
  }, 250);
}

export const epochToDateString = (e) => {
  const d = new Date(0);
  d.setUTCSeconds(e / 1000);
  return d.toString();
}

export const isValidDate = (d) => {
  if (d instanceof Date) return !isNaN(d.valueOf());
  if (typeof d === "string") return !isNaN(new Date(d).valueOf());
  return false;
};

export const getLocalTimeZoneShort = () => {
  return DateTime.local().offsetNameShort
}
