import React from 'react';
import { Typography, TypographyProps } from '@mui/material';
import { formatMarkdown } from '@equal-vote/star-vote-shared/utils/formatMarkdown';

interface FormattedDescriptionProps extends Omit<TypographyProps<'div'>, 'children' | 'component'> {
  description?: string;
}

/**
 * Component for displaying election/race descriptions with markdown formatting
 * Supports **bold** and [text](url) syntax
 */
export const FormattedDescription: React.FC<FormattedDescriptionProps> = ({
  description,
  ...typographyProps
}) => {
  if (!description) return null;

  const formattedHtml = formatMarkdown(description);

  return (
    <Typography
      {...typographyProps}
      component="div"
      dangerouslySetInnerHTML={{ __html: formattedHtml }}
    />
  );
};
