import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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

export function PlacementDistributionChart({
  placementData,
}: {
  placementData: {
    position: string;
    count: unknown;
  }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Placements</CardTitle>
        <CardDescription>
          Distribution of your positions in matches
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ChartContainer
            config={{
              count: {
                label: "Times Achieved",
                color: "#a855f7", // purple-500
              },
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={placementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="position" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="count" fill="var(--color-count)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
