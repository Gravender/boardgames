import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@board-games/ui/chart";

export function MatchDurationTrendChart({
  matchDurationData,
}: {
  matchDurationData: {
    name: string;
    duration: number;
  }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Match Duration Trend</CardTitle>
        <CardDescription>How long your matches typically last</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ChartContainer
            config={{
              duration: {
                label: "Duration (minutes)",
                color: "#8884d8",
              },
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={matchDurationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="duration"
                  stroke="var(--color-duration)"
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
