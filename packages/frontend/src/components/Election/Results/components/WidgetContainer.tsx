import { Box } from "@mui/material";

const WidgetContainer = ({ children }: { children: React.ReactNode }) => <Box className="graphs" sx={{ marginBottom: "30px", display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "30px", justifyContent: "center" }}>
  {children}
</Box>

export default WidgetContainer;
