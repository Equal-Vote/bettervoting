import { Box } from "@mui/material";

const WidgetContainer = ({ children }: { children: React.ReactNode }) => <Box
  display="flex"
  flexDirection="row"
  flexWrap="wrap"
  gap="30px"
  className="graphs"
  justifyContent="center"
  sx={{ marginBottom: "30px" }}
>
  {children}
</Box>

export default WidgetContainer;
