import { MessMenu } from "@prisma/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Coffee, Sun, Moon } from "lucide-react";

export function MessCard({ menu }: { menu: MessMenu }) {
  const getIcon = (meal: string) => {
    switch (meal.toLowerCase()) {
      case "breakfast": return <Coffee className="w-5 h-5 text-amber-500" />;
      case "lunch": return <Sun className="w-5 h-5 text-amber-500" />;
      case "dinner": return <Moon className="w-5 h-5 text-blue-500" />;
      default: return <Coffee className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const isVeg = menu.isVeg;

  return (
    <Card className="overflow-hidden border border-border/50 bg-card hover:border-border transition-all duration-200 shadow-sm hover:shadow-md">
      <CardHeader className="pb-2 flex flex-row justify-between items-start">
        <div className="flex flex-col">
          <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider mb-1">
            {menu.day}
          </div>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            {getIcon(menu.meal)}
            <span className="capitalize">{menu.meal}</span>
          </CardTitle>
        </div>
        <div 
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border bg-card shrink-0 ml-2"
          title={isVeg ? "Vegetarian" : "Non-Vegetarian"}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-20 ${isVeg ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isVeg ? 'bg-green-500' : 'bg-red-500'}`}></span>
          </span>
          <span className={isVeg ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}>
            {isVeg ? "VEG" : "NON-VEG"}
          </span>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {menu.items.split(',').map(item => item.trim()).filter(Boolean).map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
