export default function DashboardLoading() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl space-y-12 animate-pulse">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-3 w-full md:w-1/2">
          <div className="h-10 bg-muted rounded-md w-3/4"></div>
          <div className="h-5 bg-muted rounded-md w-1/2"></div>
        </div>
        <div className="h-11 bg-muted rounded-md w-40"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded-md w-48"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-card border rounded-lg"></div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded-md w-48"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-card border rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="h-8 bg-muted rounded-md w-40"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-card border rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
