import { Activity, ArrowDownRight, ArrowUpRight, Minus, AlertTriangle } from "lucide-react";

type BurnoutData = {
  score: number;
  primaryDriver: string;
  secondaryDriver: string;
  trajectory: "improving" | "stable" | "worsening";
};

export function BurnoutWidget({ data }: { data: BurnoutData }) {
  const getSeverityColor = (score: number) => {
    if (score < 4) return "text-emerald-500 bg-emerald-50 border-emerald-100";
    if (score < 7) return "text-amber-500 bg-amber-50 border-amber-100";
    return "text-red-500 bg-red-50 border-red-100";
  };

  const getTextColor = (score: number) => {
    if (score < 4) return "text-emerald-700";
    if (score < 7) return "text-amber-700";
    return "text-red-700";
  };

  const formatDriverName = (driver: string) => {
    const names: Record<string, string> = {
      deadlineClusterScore: "Deadline Cluster",
      placementAnxietyScore: "Placement Anxiety",
      selfReportedScore: "Self-Reported Stress",
      peerIsolationScore: "Peer Isolation",
      nutritionScore: "Nutrition / Skipped Meals",
      campusConfinementScore: "Campus Confinement",
      recoveryDeficitScore: "Lack of Recovery Time",
    };
    return names[driver] || driver;
  };

  const getStatusText = (score: number) => {
    if (score < 4) return "Healthy Range";
    if (score < 7) return "Elevated Risk";
    return "High Burnout Risk";
  };

  return (
    <div className={`p-5 rounded-2xl border ${getSeverityColor(data.score)}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-5 h-5" />
            <h3 className="font-semibold tracking-tight text-sm uppercase opacity-80">Wellness Pulse</h3>
          </div>
          <div className={`text-3xl font-bold ${getTextColor(data.score)}`}>
            {data.score}
            <span className="text-sm font-medium opacity-60 ml-1">/ 10</span>
          </div>
          <p className="text-sm font-medium mt-1 opacity-90">{getStatusText(data.score)}</p>
        </div>
        
        <div className="flex items-center gap-1 text-xs font-semibold uppercase px-2 py-1 rounded-full bg-white/50 backdrop-blur">
          {data.trajectory === "improving" && <><ArrowDownRight className="w-3 h-3 text-emerald-600" /> Improving</>}
          {data.trajectory === "worsening" && <><ArrowUpRight className="w-3 h-3 text-red-600" /> Worsening</>}
          {data.trajectory === "stable" && <><Minus className="w-3 h-3 text-slate-500" /> Stable</>}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-black/5 space-y-2">
        <p className="text-xs uppercase font-semibold opacity-60">Primary Drivers</p>
        <div className="space-y-1.5">
          {data.primaryDriver && (
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-current opacity-50"></span>
              {formatDriverName(data.primaryDriver)}
            </div>
          )}
          {data.secondaryDriver && (
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-current opacity-30"></span>
              {formatDriverName(data.secondaryDriver)}
            </div>
          )}
        </div>
      </div>

      {data.score >= 7 && (
        <div className="mt-4 bg-white/60 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs font-medium text-red-900 leading-snug">
            Your stress levels are exceptionally high. Consider reaching out to campus counseling or taking a forced recovery day.
          </p>
        </div>
      )}
    </div>
  );
}
