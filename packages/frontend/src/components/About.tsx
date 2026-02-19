import {
  Box,
  Container,
  Paper,
  Typography,
} from "@mui/material";
import { PrimaryButton } from "./styles";
import { useSubstitutedTranslation } from "./util";

const About = () => {
  const {t} = useSubstitutedTranslation('election');

  return (
    <Container>
      <Paper
        elevation={6}
        sx={{
          margin: "auto",
          maxWidth: "1300px",
          marginTop: "4rem",
          marginBottom: "8rem",
          padding: "1rem 2rem 2rem 2rem",
        }}
      >
        <h1>{t('about.title')}</h1>

        <Typography>
          {t('about.description')}
        </Typography>

        <h1>{t('about.team_title')}</h1>
        <h2>{t('about.leads_title')}</h2>
        <ul>{t('about.leads').map((content, i) => <li key={i}>{content}</li>)}</ul>

        <h2>{t('about.contributors_title')}</h2>
        <Box
          display="flex"
          flexDirection="row"
          flexWrap="wrap"
          gap="10px"
          sx={{ maxWidth: 800 }}
        >
          {t('about.contributors').map(({github_user_name, github_image_id}) => (
            <a href={`https://github.com/${github_user_name}`} target = "_blank" aria-label={`${github_user_name} github profile`} key={github_user_name} rel="noreferrer">
              <Box
                component="img"
                src={`https://avatars.githubusercontent.com/u/${github_image_id}?v=4`}
                sx={{ borderRadius: "100%", width: 80, heigth: 80 }}
                alt={`${github_user_name} profile picture`}
              />
            </a>
          ))}
        </Box>

        <h1>{t('about.contribute_title')}</h1>
        <Typography>
          {t('about.contribute_description')}
        </Typography>

        <h1>{t('about.donate_title')}</h1>
        <Typography>
          {t('about.donate_description')}
        </Typography>

        <PrimaryButton
          sx={{m: 3}}
          href={t('about.donate_link')}
        >
          {t('about.donate_button')}
        </PrimaryButton>

{process.env.REACT_APP_COMMIT_SHA && (
          <Typography
            sx={{
              textAlign: 'right',
              color: 'gray',
              fontSize: '0.75rem',
              mt: 4,
            }}
          >
            {process.env.REACT_APP_COMMIT_SHA}
          </Typography>
        )}
      </Paper>
    </Container>
  );
};

export default About;
