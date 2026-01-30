import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";

interface StatItem {
  label: string;
  value: string | number | JSX.Element;
}

interface StatsRowProps {
  items?: StatItem[];
  title: string;
  description: string;
  handleNew: () => void;
}

export function StatsRow({
  items,
  title,
  description,
  handleNew,
}: StatsRowProps) {
  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>
        <Button
          onClick={handleNew}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 h-11 rounded-xl shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02]"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add New Content
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {items?.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-3xl">
                {typeof item.value === "string" ||
                typeof item.value === "number"
                  ? item.value
                  : item.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
