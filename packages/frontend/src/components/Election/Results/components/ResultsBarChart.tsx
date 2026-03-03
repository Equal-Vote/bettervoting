import { useState } from "react";
import { Bar, Cell, ComposedChart, LabelList, Legend, Line, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { CHART_COLORS, formatPercent, truncName } from "~/components/util";


interface ResultsBarChartData {
  name: string;
  votes?: number | undefined; 
  count?: number | undefined; 
  score?: number | undefined; 
  [key: string]: string | number | undefined | boolean;
}

interface ResultsBarChartProps {
  data: ResultsBarChartData[];
  runoff?: boolean;
  colorOffset?: number;
  sortFunc?: ((a: ResultsBarChartData, b: ResultsBarChartData) => number);
  xKey?: 'votes' | 'count' | 'score';
  percentage?: boolean;
  percentDenominator?: number;
  stars?: number;
  majorityLegend?: string;
  majorityOffset?: boolean;
  height?: number;
  maxBarSize?: number;
  maxCandidates?: number;
}

export default function ResultsBarChart({
  data,
  runoff = false,
  colorOffset = 0,
  sortFunc = undefined,
  xKey = 'votes',
  percentage = false,
  percentDenominator = undefined,
  stars = 0,
  majorityLegend = undefined,
  majorityOffset = false,
  maxBarSize = undefined,
  maxCandidates = 10,
}: ResultsBarChartProps) {
const [rawNumbers, setRawNumbers] = useState(false);   
  const rawData = data;

  // Sort entries
  if (sortFunc) rawData.sort(sortFunc)

  // Truncate names & add percent
  const maxValue = maxBarSize ?? Math.max(...data.map(d => d[xKey]))
  percentDenominator ??= data.reduce((sum, d) => sum + d[xKey], 0);
  percentDenominator = Math.max(1, percentDenominator);
  data = rawData.map((d, i) => {
    const s = {
      ...d,
      name: ((i < stars || d['star']) ? "⭐ " : "") + truncName(d["name"], 40),
      // hack to get smaller values to allign different from larger ones
      left: (percentage && !rawNumbers)
        ? formatPercent(d[xKey] / percentDenominator)
        : (Math.round(d[xKey]*100)/100).toString(),
      right: "",
    };

    if ((d[xKey] / maxValue) < 0.3 || (majorityLegend && i == 0)) {
      s["right"] = s["left"];
      s["left"] = "";

      // this won't work for all cases, but I know it will work in the specific case I'm doing
      if(s['label']) s['right'] = s['label']
    }

    return s;
  });

  // compute colors
  let colors = [...CHART_COLORS];
  for (let i = 0; i < colorOffset; i++) {
    colors.push(colors.shift());
  }

  // Add majority
  if (majorityLegend || majorityOffset) {
    const sum = data.reduce((prev, d, i) => {
      if(i == data.length-1) return prev; // don't include exhausted or equal support votes in the denominator
      return prev + d[xKey];
    }, 0);
    const m = sum / 2;
    data = data.map((d, i) => {
      const s = { ...d };
      s[majorityLegend] = i < 2 ? m : null;
      return s;
    });
    const s = { name: "" };
    s[majorityLegend] = m;
    data.unshift(s);
    colors.unshift(colors.pop());
  }

  // Bar Max Size
  if(maxBarSize){
    const d = {name: ''}
    d[xKey] = maxBarSize;
    data = [d, ...data];
    // this is hack, I may need to add more colors later
    colors = ['#00000000', ...colors, ...colors, ...colors, ...colors, ...colors];
  }

  // Truncate entries
  if (rawData.length > maxCandidates) {
    data = data.slice(0, maxCandidates - 1);
    const item = {
      name: `+${rawData.length - (maxCandidates - 1)} more`,
      index: 0,
    };
    item[xKey] = "";
    data.push(item);
  }

  // Size margin to longest candidate
  const longestCandidateName = data.reduce(function (a, b) {
    return a.name.length > b.name.length ? a : b;
  }).name;

  // TODO: try calculating text width: https://www.geeksforgeeks.org/calculate-the-width-of-the-text-in-javascript/
  // 150 is about the max width I'd want for a small mobile device, still looking for a better solution though
  const axisWidth = Math.max(
    50,
    Math.min(
      150, // 150 since that's the width of Equal Support
      15 * (longestCandidateName.length > 20 ? 20 : longestCandidateName.length)
    )
  );
  const useTickMargin = rawData.every(d => d[xKey] === 0);
  const tickOffset = 40; 
  const adjustedAxisWidth = useTickMargin ? axisWidth + tickOffset : axisWidth;
  return (
    <div style={{width:'100%', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto'}} onMouseEnter={() => setRawNumbers(true)} onMouseLeave={() => setRawNumbers(false)}>
    <ResponsiveContainer width="90%" height={50 * data.length} style={maxBarSize ?
      {marginTop: '-50px'}: {}
    }>
      <ComposedChart data={data} barCategoryGap={5} layout="vertical">
        <XAxis hide axisLine={false} type="number" />
        <YAxis
          dataKey="name"
          type="category"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: ".8rem", fill: "black", fontWeight: "bold" }}
          width={adjustedAxisWidth}
          tickMargin={useTickMargin ? tickOffset : undefined}
          
        />
        <Bar
          dataKey={xKey}
          fill="#026A86"
          unit="votes"
          legendType="none"
          style={{overflow: 'visible'}}
        >
          {/* corresponds to mui md size */}
          {/* also this won't dynamically adjust with resizing the screen  */}
          {/* ^ I don't remember why I did that, I would think the > 900 behaviour makes sense regardless  */}
          {window.innerWidth > 900 ? <> 
            <LabelList dataKey="left" position="insideRight" fill="black" />
            <LabelList dataKey="right" position="right" fill="black" />
          </>:<>
            <LabelList dataKey="left" position="insideLeft" fill="black" />
            <LabelList dataKey="right" position="insideLeft" fill="black" />
          </>}
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={(runoff && index == data.length-1)? 'var(--brand-gray-1)' : colors[index % colors.length]} />
          ))}
        </Bar>
        <Line
          dataKey={majorityLegend}
          dot={false}
          stroke="black"
          strokeWidth={3}
          strokeDasharray="6 6"
          legendType="plainline"
        />
        {majorityLegend && <Legend />}
      </ComposedChart>
    </ResponsiveContainer>
    </div>
  );
};
