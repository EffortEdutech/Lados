/**
 * Dashboard page — Sprint 2 (S2-A08)
 *
 * Placeholder for Sprint 1. Full implementation in Sprint 2.
 */
export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sprint 1 scaffold — full dashboard in Sprint 2
          </p>
        </div>

        {/* Sprint status cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { label: 'Projects', value: '—', color: 'bg-blue-50 text-blue-700' },
            { label: 'Workflows', value: '—', color: 'bg-purple-50 text-purple-700' },
            { label: 'Pending Approvals', value: '—', color: 'bg-amber-50 text-amber-700' },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <p className={`mt-2 text-3xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Quick Actions</h2>
          <div className="flex gap-3">
            <button
              disabled
              className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg opacity-50 cursor-not-allowed"
            >
              + New Project
            </button>
            <button
              disabled
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg opacity-50 cursor-not-allowed"
            >
              Browse Templates
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-400">Enabled in Sprint 2</p>
        </div>

        {/* Build status */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-medium text-green-800">
            ✅ Sprint 1 scaffold complete — monorepo is running
          </p>
          <p className="mt-1 text-xs text-green-600">
            API: http://localhost:4000/api/v1/health · Web: http://localhost:3000
          </p>
        </div>
      </div>
    </div>
  );
}
