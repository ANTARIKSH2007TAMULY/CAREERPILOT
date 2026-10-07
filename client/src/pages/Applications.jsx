import { useEffect, useState } from 'react';
import KanbanBoard from '../components/applications/KanbanBoard';
import EmptyState from '../components/ui/EmptyState';
import LoadingState from '../components/ui/LoadingState';
import { applicationService } from '../services/applicationService';

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const response = await applicationService.getApplications();
      setApplications(response.data?.data?.applications || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  if (loading) {
    return <LoadingState label="Loading application board…" />;
  }

  if (applications.length === 0) {
    return (
      <EmptyState
        title="No applications yet"
        description="Track your outreach pipeline as you move from saved roles to offers and follow-ups."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm uppercase tracking-[0.2em] text-sky-300">Pipeline</div>
        <h1 className="mt-2 text-3xl font-semibold text-white">Application tracker</h1>
      </div>

      <KanbanBoard applications={applications} />
    </div>
  );
}
