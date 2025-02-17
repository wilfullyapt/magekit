export function LoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden animate-pulse"
        >
          <div className="h-48" />
        </div>
      ))}
    </div>
  );
}
