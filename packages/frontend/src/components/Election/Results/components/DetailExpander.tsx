import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { Box, MenuItem, Select, Typography } from "@mui/material";
import _uniqueId from "lodash/uniqueId";
import React, { ReactNode, useRef, useState } from "react";
import useAnonymizedBallots from "~/components/AnonymizedBallotsContextProvider";
import { scrollToElement } from "~/components/util";
import WidgetContainer from "./WidgetContainer";
import HeadToHeadWidget from "./HeadToHeadWidget";
import VoterProfileWidget from "./VoterProfileWidget";
import VoterIntentWidget from "./VoterIntentWidget";
import VoterErrorStatsWidget from "./VoterErrorStatsWidget";
import ColumnDistributionWidget from "./ColumnDistributionWidget";
import ScoreRangeWidget from "./ScoreRangeWidget";
import NameRecognitionWidget from "./NameRecognitionWidget";
import useRace from "~/components/RaceContextProvider";
import STARResultDetailedStepsWidget from "../STAR/STARResultDetailedStepsWidget";
import STAREqualPreferencesWidget from "../STAR/STAREqualPreferencesWidget";


interface DetailExpanderProps {
  children: ReactNode[] | ReactNode;
  level?: number;
}

const DetailExpander = ({ children, level = 0 }: DetailExpanderProps) => {
  const [viewDetails, setViewDetails] = useState(false);
  const expanderId = useRef(_uniqueId("detailExpander")).current;
  const {ballots, fetchBallots} = useAnonymizedBallots();
  const [selector, setSelector] = useState(0);
  const selectorTitleKeys = new Map();
  selectorTitleKeys.set(VoterProfileWidget, 'results_ext.voter_profile_title');
  selectorTitleKeys.set(HeadToHeadWidget, 'results_ext.head_to_head_title');
  selectorTitleKeys.set(VoterIntentWidget, 'results_ext.voter_intent_title');
  selectorTitleKeys.set(VoterErrorStatsWidget, 'results_ext.voter_error_title');
  selectorTitleKeys.set(ColumnDistributionWidget, 'results_ext.column_distribution_title');
  selectorTitleKeys.set(ScoreRangeWidget, 'results_ext.score_range_title');
  selectorTitleKeys.set(NameRecognitionWidget, 'results_ext.name_recognition_title');
  selectorTitleKeys.set(STARResultDetailedStepsWidget, 'results.star.detailed_steps_title');
  selectorTitleKeys.set(STAREqualPreferencesWidget, 'results.star.equal_preferences_title');

  const { t } = useRace();

  const title = [
    t("results.details"),
    t("results.additional_info"),
  ][level];

  return (
    <>
      <Box
        className={`detailExpander ${expanderId}`}
        sx={{
          display: "flex",
          flexDirection: "row",
          gap: 10,
          justifyContent: "center",
          cursor: "pointer",
          alignItems: "center",
        }}
        onClick={() => {
          if (!viewDetails)
            scrollToElement(document.querySelector(`.${expanderId}`));
          fetchBallots();
          setViewDetails(!viewDetails);
        }}
      >
        <Typography variant="h6" sx={{ "@media print": { display: "none" } }}>
          {title}
        </Typography>
        {!viewDetails && (
          <ExpandMore sx={{ "@media print": { display: "none" } }} />
        )}
        {viewDetails && (
          <ExpandLess sx={{ "@media print": { display: "none" } }} />
        )}
      </Box>
      {viewDetails && ballots && level == 0 && children}
      {viewDetails && ballots && level == 1 && <>
        <Select
          value={selector}
          label={'Stats for Nerds Selector'}
          onChange={(e) => setSelector(e.target.value as number)}
          sx={{mb: 2, width: '300px', textAlign: 'left'}}
        >
            {
              React.Children.toArray(children)
              .filter(c => React.isValidElement(c) && selectorTitleKeys.has((c as React.ReactElement).type))
              .map((c, i) => React.isValidElement(c) && <MenuItem key={i} value={i}>{t(selectorTitleKeys.get(c.type), {includeTips: false})}</MenuItem>)
            }
        </Select>
        <WidgetContainer >
          {children[selector]}
        </WidgetContainer>
      </>}
      {viewDetails && !ballots && 'Loading...'}
    </>
  );
}

export default DetailExpander;
