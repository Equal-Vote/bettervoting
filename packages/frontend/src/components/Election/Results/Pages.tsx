import { Pagination } from "@mui/material";
import Widget from "./components/Widget";
import WidgetContainer from "./components/WidgetContainer";

interface PagesProps {
  children: React.ReactNode;
  pageCount: number; /* one-based */
  title?: string;
  page: number; /* one-based */
  setPage: (page: number) => void; /* closure */
}

const Pages = ({
  children, pageCount, title, page, setPage /* one-based */
}: PagesProps) => {
  if (1 === pageCount) return <>{children}</>;
  const handleChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value); /* closure */
  };
  if (title) return <WidgetContainer>
    <Widget title={title} wide>
      {children}
      <Pagination count={pageCount} page={page} onChange={handleChange} />
    </Widget>
  </WidgetContainer>;
  return <>
    {children}
    <Pagination count={pageCount} page={page} onChange={handleChange} />
  </>
};

export default Pages
