import React, { useContext } from 'react'
import { PaletteOptions, Theme, createTheme, responsiveFontSizes, ThemeProvider } from '@mui/material/styles'
import { createContext } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { TypographyOptions } from '@mui/material/styles/createTypography';
import { useMediaQuery } from '@mui/material';
import useFeatureFlags from './components/FeatureFlagContextProvider';

declare module '@mui/material/styles' {
  interface Palette {
    brand: Palette['primary'];
  }

  interface PaletteOptions {
    brand?: PaletteOptions['primary'];
  }
  interface Palette {
    lightAccent: Palette['primary'];
  }

  interface PaletteOptions {
    lightAccent?: PaletteOptions['primary'];
  }
  interface Palette {
    darkAccent: Palette['primary'];
  }

  interface PaletteOptions {
    darkAccent?: PaletteOptions['primary'];
  }
  interface Palette {
    lightShade: Palette['primary'];
  }

  interface PaletteOptions {
    lightShade?: PaletteOptions['primary'];
  }
  interface Palette {
    darkShade: Palette['primary'];
  }

  interface PaletteOptions {
    darkShade?: PaletteOptions['primary'];
  }
}

declare module '@mui/material/styles' {

  interface PaletteColor {
    purple?: string;
    yellow?: string;
    ltblue?: string;
    blue?: string;
    gold?: string;
    warning?: string;
    red?: string;
    orange?: string;
    green?: string;
    black?: string;
    white?: string;
    gray5?: string;
    gray4?: string;
    gray3?: string;
    gray2?: string;
    gray1?: string;
    grayAlpha?: string;

    //transparent colors
    purpleTransparent20?: string;
    yellowTransparent20?: string;
    ltblueTransparent20?: string;
    blueTransparent20?: string;
    goldTransparent20?: string;
    redTransparent20?: string;
    orangeTransparent20?: string;
    greenTransparent20?: string;
    blackTransparent20?: string;
    gray5Transparent20?: string;
    gray4Transparent20?: string;
    gray3Transparent20?: string;
    gray2Transparent20?: string;
    gray1Transparent20?: string;
    warningColumn?: string;
  }

  interface SimplePaletteColorOptions {
    purple?: string;
    yellow?: string;
    ltblue?: string;
    blue?: string;
    gold?: string;
    warning?: string;
    red?: string;
    orange?: string;
    green?: string;
    black?: string;
    white?: string;
    gray5?: string;
    gray4?: string;
    gray3?: string;
    gray2?: string;
    gray1?: string;
    grayAlpha?: string;
    
    //transparent colors
    purpleTransparent20?: string;
    yellowTransparent20?: string;
    ltblueTransparent20?: string;
    blueTransparent20?: string;
    goldTransparent20?: string;
    redTransparent20?: string;
    orangeTransparent20?: string;
    greenTransparent20?: string;
    blackTransparent20?: string;
    gray5Transparent20?: string;
    gray4Transparent20?: string;
    gray3Transparent20?: string;
    gray2Transparent20?: string;
    gray1Transparent20?: string;
    warningColumn?: string;
  }

}
const brandPalette: PaletteOptions = {
  brand: {
    main: '#000000',
    /* https://docs.google.com/presentation/d/1NSAirKzmq4YyUPB56NR3pKiRTn3W9btwnUtHi_zteeU/edit#slide=id.g827b1a2992_5_86*/
    purple: '#4D2586',
    yellow: '#FFFF54FF',
    ltblue: '#2AA2B3',
    blue: '#02627C',
    gold: '#FFE156',
    warning: '#ed6c02',
    red: '#EE2C53',
    orange: '#FF9900',
    green: '#60B33C',
    black: '#000000',
    white: '#FFFFFF',
    /* https://docs.google.com/presentation/d/1NSAirKzmq4YyUPB56NR3pKiRTn3W9btwnUtHi_zteeU/edit#slide=id.g177cd3ac88b_0_0 */
    gray5: '#1F1F1F', /* Charcoal used in "How does STAR Voting Work?" graphic */
    gray4: '#666666', /* Bubbles on ballots */
    gray3: '#999999', /* Lines separating candidates on ballot */
    gray2: '#CCCCCC', /* Stars on STAR ballots */
    gray1: '#ECECEC', /* Highlight for alternating candidates on ballots */
    grayAlpha: '#7B7B7B7D', /* For graying out candidates for the "How does STAR Voting Work?" Graphic (has transparency)*/

    purpleTransparent20: '#4D258633',  // 20% opacity
    yellowTransparent20: '#FFFF5433', 
    ltblueTransparent20: '#2AA2B333',
    blueTransparent20: '#02627C33',
    goldTransparent20: '#FFE15633',
    redTransparent20: '#EE2C5333',
    orangeTransparent20: '#FF990033',
    greenTransparent20: '#60B33C33',
    blackTransparent20: '#00000033',
    gray5Transparent20: '#1F1F1F33',
    gray4Transparent20: '#66666633',
    gray3Transparent20: '#99999933',
    gray2Transparent20: '#CCCCCC33',
    gray1Transparent20: '#ECECEC33',
    warningColumn: '#FFDD0080',
  }
}

const brandTypography: TypographyOptions = {
  // fontFamily: 'Montserrat',
  fontFamily: 'Verdana, sans-serif',
  button:{
    fontFamily: '\'Montserrat\', Verdana, sans-serif',
  },
  h1: {
    fontFamily: '\'Montserrat\', Verdana, sans-serif',
    marginTop: '1rem',
    marginBottom: '1rem',
  },
  h2: {
    fontFamily: '\'Montserrat\', Verdana, sans-serif',
    marginTop: '1rem',
    marginBottom: '1rem',
  },
  h3: {
    fontFamily: '\'Montserrat\', Verdana, sans-serif',
    marginTop: '1rem',
    marginBottom: '1rem',
    // display: 'inline',
    // background: 'yellow',
    margin: 'auto'
  },
  h4: {
    fontFamily: '\'Montserrat\', Verdana, sans-serif',
    marginTop: '1rem',
    marginBottom: '1rem',
  },
  h5: {
    fontFamily: '\'Montserrat\', Verdana, sans-serif',
    marginTop: '1rem',
    marginBottom: '1rem',
  },
  h6: {
    fontFamily: '\'Montserrat\', Verdana, sans-serif',
    marginTop: '1rem',
    marginBottom: '1rem',
  },
}

const themes = {
  base: responsiveFontSizes(createTheme({
    palette: {
      brand: brandPalette.brand
    },
    typography: brandTypography
  }
  )),
  turquoise: responsiveFontSizes(createTheme({
    palette: {
      lightShade: {
        main: '#F7F9F8',
        contrastText: '#000',
      },
      lightAccent: {
        main: '#82BFCF',
        contrastText: '#000',
      },
      primary: {
        //main: '#2AA2B3',
        main: '#000',
        //pop: 'var(--brand-pop)',
      },
      secondary: {
        main: '#6C757D',
        light: '#a9cef4',
        dark: '#343A40'
      },
      darkAccent: {
        main: '#898A85',
        contrastText: '#fff',
      },
      // 1F 28 2E 2F 3F
      darkShade: {
        main: '#282828', //'var(--brand-pop)',//'#073763',//'#2B344A',
        contrastText: '#fff',
      },
      brand: brandPalette.brand
    },
    typography: brandTypography
  })),
  darkMode: responsiveFontSizes(createTheme({
    palette: {
      mode: 'dark',
      brand: brandPalette.brand
    },
    typography: brandTypography
  })),
}

type mode = keyof typeof themes | 'browserDefault'
type ThemeContextType = {
  mode: mode,
  modes: mode[],
  selectColorMode: (mode: mode) => void,
  theme: Theme,
}

export const ThemeContext = createContext<ThemeContextType>({ mode: 'base', modes: Object.keys(themes) as mode[], selectColorMode: () => { }, theme: themes.turquoise })
interface ThemeContextProviderProps {
  children: React.ReactNode
}
export const ThemeContextProvider = ({ children }:ThemeContextProviderProps) => {
  const flags = useFeatureFlags();
  // https://mui.com/material-ui/customization/dark-mode/#system-preference
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useLocalStorage<mode>('themeMode', 'browserDefault');
  let theme;
  if(flags.isSet('THEMES')){
    if(mode === 'browserDefault'){
      theme = themes[prefersDarkMode? 'darkMode' : 'turquoise'];
    }else{
      theme = themes[mode];
    }
  }else{
    theme = themes['turquoise']
  }

  const value: ThemeContextType = {
    mode: mode,
    modes: Object.keys(themes) as mode[],
    selectColorMode: newMode => setMode(newMode),
    theme
  }

  return (
    <ThemeContext.Provider value={value} >
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  )
}

export function useThemeSelector() {
  return useContext(ThemeContext)
} 