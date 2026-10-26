import {
  AlertCircle,
  Briefcase,
  Check,
  Columns,
  Filter,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ApplicationListView from '../components/applications/ApplicationListView';
import ApplicationModal from '../components/applications/ApplicationModal';
import InterviewModal from '../components/applications/InterviewModal';
import KanbanBoard from '../components/applications/KanbanBoard';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import LoadingState from '../components/ui/LoadingState';
import PageHeader from '../components/ui/PageHeader';
import Toast from '../components/ui/Toast';
import { applicationService } from '../services/applicationService';
import interviewService from '../services/interviewService';

const STATUS_FILTERS = [
  { key: 'ALL', label: 'All Stages' },
  { key: 'INTERESTED', label: 'Interested' },
  { key: 'APPLIED', label: 'Applied' },
  { key: 'INTERVIEW', label: 'Interview' },
  { key: 'OFFER', label: 'Offer' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'WITHDRAWN', label: 'Withdrawn' },
];

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('recent');
  const [viewMode, setViewMode] = useState('board'); // 'board' or 'list'

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Interview modal state
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [interviewingApp, setInterviewingApp] = useState(null);
  const [selectedInterview, setSelectedInterview] = useState(null);

  // Delete confirmation
  const [deletingApp, setDeletingApp] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status feedback toast
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleOpenScheduleInterview = async (app, existingInterview = null) => {
    setInterviewingApp(app);
    if (existingInterview) {
      setSelectedInterview(existingInterview);
      setIsInterviewModalOpen(true);
      return;
    }

    if (app?.interviews && app.interviews.length > 0 && typeof app.interviews[0] === 'object' && app.interviews[0]?.startTime) {
      const active = app.interviews.find((i) => i.status === 'SCHEDULED') || app.interviews[0];
      setSelectedInterview(active);
    } else if (app?._id && (app.interviewDate || (app.interviews && app.interviews.length > 0))) {
      try {
        const res = await interviewService.getInterviewsByApplication(app._id);
        const interviews = res.data?.data?.interviews || [];
        const active = interviews.find((i) => i.status === 'SCHEDULED') || interviews[0] || null;
        setSelectedInterview(active);
      } catch (err) {
        console.error('Failed to resolve application interview:', err);
        setSelectedInterview(null);
      }
    } else {
      setSelectedInterview(null);
    }
    setIsInterviewModalOpen(true);
  };

  const fetchApplications = async () => {
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      if (sortBy) params.sort = sortBy;

      const response = await applicationService.getApplications(params);
      setApplications(response.data?.data?.applications || []);
    } catch (error) {
      console.error('Failed to load applications:', error);
      showToast('Failed to load applications. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter, sortBy]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchApplications();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Status change handler
  const handleStatusChange = async (appId, newStatus) => {
    try {
      const response = await applicationService.updateApplication(appId, { status: newStatus });
      const updated = response.data?.data?.application;

      setApplications((prev) =>
        prev.map((app) => (app._id === appId ? { ...app, ...updated } : app))
      );
      showToast(`Status updated to ${newStatus}`);
    } catch (err) {
      console.error('Failed to update status:', err);
      showToast(err.response?.data?.message || 'Failed to update application status', 'error');
    }
  };

  // Create or Update
  const handleSaveApplication = async (formData) => {
    setIsSubmitting(true);
    try {
      if (editingApp) {
        const response = await applicationService.updateApplication(editingApp._id, formData);
        const updated = response.data?.data?.application;
        setApplications((prev) =>
          prev.map((app) => (app._id === editingApp._id ? { ...app, ...updated } : app))
        );
        showToast('Application updated successfully');
      } else {
        const response = await applicationService.createApplication(formData);
        const created = response.data?.data?.application;
        if (created) {
          setApplications((prev) => [created, ...prev]);
        }
        showToast('Application added to pipeline');
      }
      setIsModalOpen(false);
      setEditingApp(null);
    } catch (err) {
      console.error('Failed to save application:', err);
      showToast(err.response?.data?.message || 'Failed to save application', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete
  const handleConfirmDelete = async () => {
    if (!deletingApp) return;
    setIsDeleting(true);
    try {
      await applicationService.deleteApplication(deletingApp._id);
      setApplications((prev) => prev.filter((a) => a._id !== deletingApp._id));
      showToast('Application removed from tracker');
      setDeletingApp(null);
    } catch (err) {
      console.error('Failed to delete application:', err);
      showToast(err.response?.data?.message || 'Failed to delete application', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading application board…" />;
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      {/* Header */}
      <PageHeader
        category="Hiring Pipeline"
        categoryIcon={Briefcase}
        title="Application tracker"
        description="Manage your end-to-end recruitment lifecycle from prospective roles to signed offers."
        actions={
          <div className="flex items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/90 p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode('board')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  viewMode === 'board'
                    ? 'bg-brand-500/20 text-brand-300 font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Board View"
              >
                <Columns className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Board</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  viewMode === 'list'
                    ? 'bg-brand-500/20 text-brand-300 font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="List View"
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>

            <Button
              variant="accent"
              icon={Plus}
              onClick={() => {
                setEditingApp(null);
                setIsModalOpen(true);
              }}
            >
              Track New Role
            </Button>
          </div>
        }
      />

      {/* Controls Bar: Search, Status Filter, Sort */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/80 p-3.5 shadow-xs dark:shadow-card backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by job title or company…"
            className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900/80 py-2.5 pl-10 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Filter className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
          >
            <option value="recent">Recently Updated</option>
            <option value="appliedAt">Date Applied</option>
            <option value="company">Company (A-Z)</option>
            <option value="title">Role Title (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {applications.length === 0 && !search && statusFilter === 'ALL' ? (
        <EmptyState
          icon={Briefcase}
          title="No applications tracked yet"
          description="Track your hiring journey step-by-step from prospective roles to final offers."
          action={
            <div className="flex flex-wrap gap-2.5 justify-center">
              <Button
                variant="accent"
                icon={Plus}
                onClick={() => {
                  setEditingApp(null);
                  setIsModalOpen(true);
                }}
              >
                Track a Role Manually
              </Button>
              <Link to="/jobs">
                <Button variant="secondary">
                  Discover Jobs
                </Button>
              </Link>
            </div>
          }
        />
      ) : viewMode === 'board' ? (
        <KanbanBoard
          applications={applications}
          onStatusChange={handleStatusChange}
          onEdit={(app) => {
            setEditingApp(app);
            setIsModalOpen(true);
          }}
          onDelete={(app) => setDeletingApp(app)}
          onScheduleInterview={(app) => handleOpenScheduleInterview(app)}
        />
      ) : (
        <ApplicationListView
          applications={applications}
          onStatusChange={handleStatusChange}
          onEdit={(app) => {
            setEditingApp(app);
            setIsModalOpen(true);
          }}
          onDelete={(app) => setDeletingApp(app)}
          onScheduleInterview={(app) => handleOpenScheduleInterview(app)}
        />
      )}

      {/* Create / Edit Modal */}
      {isModalOpen ? (
        <ApplicationModal
          isOpen={isModalOpen}
          initialData={editingApp}
          isSubmitting={isSubmitting}
          onScheduleInterview={(app) => handleOpenScheduleInterview(app)}
          onClose={() => {
            setIsModalOpen(false);
            setEditingApp(null);
          }}
          onSubmit={handleSaveApplication}
        />
      ) : null}

      {/* Schedule / Reschedule Interview Modal */}
      {isInterviewModalOpen ? (
        <InterviewModal
          isOpen={isInterviewModalOpen}
          application={interviewingApp}
          interview={selectedInterview}
          onClose={() => {
            setIsInterviewModalOpen(false);
            setInterviewingApp(null);
            setSelectedInterview(null);
          }}
          onSuccess={(savedInterview) => {
            fetchApplications();
            if (savedInterview?.deleted) {
              showToast('Interview cancelled and pending reminders removed.', 'info');
            } else {
              showToast('Interview saved! Automated email reminders active.', 'success');
            }
          }}
        />
      ) : null}

      {/* Delete Confirmation Modal */}
      {deletingApp ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-navy-950/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 p-6 shadow-2xl animate-scale-in">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Delete tracked application?</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Are you sure you want to remove{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {deletingApp.jobTitle || deletingApp.job?.title || 'this application'}
              </span>{' '}
              at{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {deletingApp.company || deletingApp.job?.company || 'Company'}
              </span>
              ? This action will remove it from your pipeline board and active statistics.
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeletingApp(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                loading={isDeleting}
              >
                Delete Role
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
