const colors = {
  // Lead
  NEW: 'bg-gray-100 text-gray-700',
  SURVEY_SCHEDULED: 'bg-blue-100 text-blue-700',
  SURVEY_DONE: 'bg-indigo-100 text-indigo-700',
  PROPOSAL_SENT: 'bg-yellow-100 text-yellow-700',
  CEO_APPROVAL_PENDING: 'bg-orange-100 text-orange-700',
  CEO_APPROVED: 'bg-lime-100 text-lime-700',
  CLIENT_APPROVAL_PENDING: 'bg-amber-100 text-amber-700',
  CLIENT_APPROVED: 'bg-teal-100 text-teal-700',
  CONTRACTED: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
  // Project
  PLANNING: 'bg-gray-100 text-gray-700',
  DESIGN: 'bg-blue-100 text-blue-700',
  PROCUREMENT: 'bg-yellow-100 text-yellow-700',
  EXECUTION: 'bg-orange-100 text-orange-700',
  COMMISSIONING: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700',
  ON_HOLD: 'bg-red-100 text-red-700',
  // Design
  DRAFT: 'bg-gray-100 text-gray-700',
  INTERNAL_REVIEW: 'bg-blue-100 text-blue-700',
  ENG_APPROVED: 'bg-lime-100 text-lime-700',
  SENT_TO_CLIENT: 'bg-yellow-100 text-yellow-700',
  // Generic
  ACTIVE: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-red-100 text-red-700',
  OPEN: 'bg-red-100 text-red-700',
  RESOLVED: 'bg-green-100 text-green-700',
  PASS: 'bg-green-100 text-green-700',
  FAIL: 'bg-red-100 text-red-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
  UNPAID: 'bg-red-100 text-red-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  OVERDUE: 'bg-red-200 text-red-800',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  SIGNED: 'bg-green-100 text-green-700',
  RECEIVED: 'bg-green-100 text-green-700',
  ORDERED: 'bg-blue-100 text-blue-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export default function StatusBadge({ status }) {
  const cls = colors[status] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}
