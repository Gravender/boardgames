import {
  Cell,
  Legend,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
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

const WIN_COLOR = "#10b981"; // green-500
const LOSS_COLOR = "#ef4444"; // red-500
export function WinLoseRatioChart({
  winLossData,
}: {
  winLossData: {
    name: string;
    value: number;
  }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Win/Loss Ratio</CardTitle>
        <CardDescription>Your performance in this game</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ChartContainer
            config={{
              won: {
                label: "Won",
                color: WIN_COLOR,
              },
              lost: {
                label: "Lost",
                color: LOSS_COLOR,
              },
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={winLossData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  <Cell key="won" fill="var(--color-won)" />
                  <Cell key="lost" fill="var(--color-lost)" />
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
