import { Box, Typography } from '@mui/material';

interface ScoreIconProps {
	opacity: number;
	value: string;
	fontSX: object;
}
const ScoreIcon = ({ opacity, value, fontSX }: ScoreIconProps) => (
	<Box
		sx={{
			position: 'relative',
			aspectRatio: '1 / 1',
			alignContent: 'center',
		}}
	>
		<Box
			component="img"
			src="/images/star_icon.png"
			sx={{
				opacity: opacity,
				aspectRatio: '1 / 1',
				height: { xs: '100%', sm: '80%' },
			}}
			className="starIcon"
			alt="star icon"
		/>
		<Typography className="scoreColumnHeading" sx={{ ...fontSX }}>
			{value}
		</Typography>
	</Box>
);
export default ScoreIcon;
