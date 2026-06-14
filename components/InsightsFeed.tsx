import { AlertTriangle, Info, BellRing, ArrowRight } from "lucide-react";
import Link from "next/link";

type Alert = {
  type: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  actionLabel?: string;
  actionRoute?: string;
};

export function InsightsFeed({ alerts }: { alerts: Alert[] }) {
  if (!alerts || alerts.length === 0) return null;

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-50 border-red-200 text-red-900";
      case "warning": return "bg-amber-50 border-amber-200 text-amber-900";
      default: return "bg-blue-50 border-blue-200 text-blue-900";
    }
  };

  const getIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />;
      case "warning": return <BellRing className="w-5 h-5 text-amber-600 shrink-0" />;
      default: return <Info className="w-5 h-5 text-blue-600 shrink-0" />;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[var(--color-midnight-navy)] flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-purple-500" />
          Proactive Insights
        </h3>
      </div>
      
      <div className="space-y-3">
        {alerts.map((alert, i) => (
          <div key={i} className={`p-4 rounded-xl border ${getSeverityStyles(alert.severity)}`}>
            <div className="flex items-start gap-3">
              {getIcon(alert.severity)}
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">{alert.title}</h4>
                <p className="text-sm opacity-80 leading-snug mb-3">{alert.body}</p>
                {alert.actionRoute && alert.actionLabel && (
                  <Link 
                    href={alert.actionRoute}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide hover:underline"
                  >
                    {alert.actionLabel}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SparklesIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
    </svg>
  );
}
