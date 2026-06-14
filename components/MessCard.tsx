import { MessMenu } from "@prisma/client";
import { Coffee, Sun, Moon, Sunrise } from "lucide-react";

export function MessCard({ menu }: { menu: MessMenu }) {
  const getMealIcon = (meal: string) => {
    const m = meal.toLowerCase();
    if (m.includes("breakfast")) return <Sunrise className="w-[18px] h-[18px] text-[#6B7280]" />;
    if (m.includes("lunch")) return <Sun className="w-[18px] h-[18px] text-[#6B7280]" />;
    if (m.includes("dinner")) return <Moon className="w-[18px] h-[18px] text-[#6B7280]" />;
    return <Coffee className="w-[18px] h-[18px] text-[#6B7280]" />;
  };

  const isNonVegDish = (itemName: string) => {
    const nonVegKeywords = ["egg", "chicken", "fish", "mutton", "meat", "pork", "beef", "omelette"];
    return nonVegKeywords.some(kw => itemName.toLowerCase().includes(kw));
  };

  const items = menu.items.split(',').map(item => item.trim()).filter(Boolean);

  return (
    <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[12px] p-[16px_18px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getMealIcon(menu.meal)}
          <span className="text-[15px] font-[600] text-[#111827] capitalize ml-[8px]">
            {menu.meal}
          </span>
        </div>
        
        {menu.isVeg ? (
          <div className="flex items-center gap-1.5 bg-[#F0FDF4] text-[#16A34A] rounded-[4px] px-[8px] py-[2px] text-[11px] font-[600]">
            <span className="w-[6px] h-[6px] rounded-full bg-[#16A34A]" />
            VEG
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-[#FEF2F2] text-[#DC2626] rounded-[4px] px-[8px] py-[2px] text-[11px] font-[600]">
            <span className="w-[6px] h-[6px] rounded-full bg-[#DC2626]" />
            NON-VEG
          </div>
        )}
      </div>

      <div className="border-b border-[#F3F4F6] my-[12px]" />

      <div className="flex flex-col gap-0">
        {items.map((item, idx) => {
          const isDishNonVeg = isNonVegDish(item);
          return (
            <div key={idx} className="flex items-center gap-2">
              <span 
                className={`w-[6px] h-[6px] rounded-full shrink-0 ${isDishNonVeg ? 'bg-[#DC2626]' : 'bg-[#16A34A]'}`} 
              />
              <span className="text-[13px] text-[#374151] leading-[1.8]">
                {item}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
