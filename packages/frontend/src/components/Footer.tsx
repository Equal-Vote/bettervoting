import * as React from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import Grid from "@mui/material/Grid";
import { Facebook, Instagram, X, GitHub } from "@mui/icons-material";
import { Box, useTheme } from "@mui/material";
import { useThemeSelector } from "../theme";
import { useSubstitutedTranslation } from "./util";
export default function Footer() {
  const themeSelector = useThemeSelector()
  const {t} = useSubstitutedTranslation();
  return (
    <Box
      sx={{
        backgroundColor: themeSelector.mode === 'darkMode' ? 'brand.gray5' : 'brand.gray1',
        p: 6,
        width: '100%',
        mt: 'auto',
        '@media print': {
          display: 'none'
        }
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={5}>
          <Grid item xs={12} md={4} >
            <Typography variant="h6" color="text.primary" gutterBottom sx={{textAlign: {xs: 'center',md: 'left'}}}>
              {t('footer.project_title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{textAlign: 'left'}}>
              {t('footer.project_description')}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" color="text.primary" gutterBottom sx={{
              pl: 1, pr: 1,
              textAlign: {xs: 'center', md: 'left'}
            }}>
              {t('footer.about_us_title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{
              pl: 1, pr: 1
            }}>
              {t('footer.about_us_description')}
            </Typography>
          </Grid>
          <Grid item xs={12} md={4} >
            <Box component="img" src="https://assets.nationbuilder.com/unifiedprimary/sites/1/meta_images/original/Equal_Vote_website_header_logo.png?1703733898" sx={{width: '100%', padding: 2, background: 'black'}}/>
            <Typography variant="body2" color="text.primary" gutterBottom sx={{
              pl: 1, pr: 1,
              textAlign: {
                xs: 'center',
                md: 'left'
              },
              marginTop: 2
            }} >
              {t('footer.social_action')}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                justifyContent: { xs: 'center', md: 'flex-start' }
              }}>

              <Link href="https://www.facebook.com/STARVoting" color="inherit"
                sx={{ pl: 1, pr: 1 }}>
                <Facebook />
              </Link>
              <Link
                href="https://www.instagram.com/starvoting/"
                color="inherit"
                sx={{ pl: 1, pr: 1, color: 'black' }}
              >
                <Instagram />
              </Link>
              <Link href="https://twitter.com/5starvoting" color="inherit"
                sx={{ pl: 1, pr: 1 }}>
                <X />
              </Link>
              <Link href="https://github.com/Equal-Vote" color="inherit"
                sx={{ pl: 1, pr: 1 }}>
                <GitHub />
              </Link>
            </Box>
          </Grid>
        </Grid>
        {/* Commenting out copyright until that's figured out */}
        {/* <Box mt={5}>
          <Typography variant="body2" color="text.secondary" align="center">
            {"Copyright © "}
            <Link color="inherit" href="https://your-website.com/">
              Your Website
            </Link>{" "}
            {new Date().getFullYear()}
            {"."}
          </Typography>
        </Box> */}
      </Container>
    </Box >
  );
}