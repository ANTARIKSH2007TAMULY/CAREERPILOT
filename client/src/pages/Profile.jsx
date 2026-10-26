import {
  Briefcase,
  Check,
  Compass,
  Github,
  Globe,
  Linkedin,
  MapPin,
  Sparkles,
  User,
  UserCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '../components/ui/Button';
import LoadingState from '../components/ui/LoadingState';
import PageHeader from '../components/ui/PageHeader';
import Toast from '../components/ui/Toast';
import api from '../services/api';

const emptyProfile = {
  name: '',
  skills: '',
  preferredRoles: '',
  preferredLocations: '',
  preferredJobTypes: '',
  preferredWorkModes: '',
  resume: '',
  socialLinks: {
    linkedin: '',
    github: '',
    portfolio: '',
  },
};

export default function Profile() {
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/user/profile');
        const user = response.data?.data?.user || {};
        setProfile({
          name: user.name || '',
          skills: (user.skills || []).join(', '),
          preferredRoles: (user.preferredRoles || []).join(', '),
          preferredLocations: (user.preferredLocations || []).join(', '),
          preferredJobTypes: (user.preferredJobTypes || []).join(', '),
          preferredWorkModes: (user.preferredWorkModes || []).join(', '),
          resume: user.resume || '',
          socialLinks: {
            linkedin: user.socialLinks?.linkedin || '',
            github: user.socialLinks?.github || '',
            portfolio: user.socialLinks?.portfolio || '',
          },
        });
      } catch (error) {
        console.error(error);
        showToast('Failed to load profile details.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  };

  const handleSocialLinkChange = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({
      ...current,
      socialLinks: {
        ...current.socialLinks,
        [name]: value,
      },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.put('/user/profile', {
        name: profile.name,
        skills: profile.skills.split(',').map((item) => item.trim()).filter(Boolean),
        preferredRoles: profile.preferredRoles.split(',').map((item) => item.trim()).filter(Boolean),
        preferredLocations: profile.preferredLocations.split(',').map((item) => item.trim()).filter(Boolean),
        preferredJobTypes: profile.preferredJobTypes.split(',').map((item) => item.trim()).filter(Boolean),
        preferredWorkModes: profile.preferredWorkModes.split(',').map((item) => item.trim()).filter(Boolean),
        resume: profile.resume,
        socialLinks: profile.socialLinks,
      });
      showToast('Profile updated successfully!');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading profile data…" />;
  }

  return (
    <div className="space-y-6">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <PageHeader
        category="Account & Identity"
        categoryIcon={UserCheck}
        title="Career profile"
        description="Configure your skills, target roles, preferred work models, and social handles used across job matching and AI coaching."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/80 p-5 shadow-xs dark:shadow-card backdrop-blur-sm">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <User className="h-4 w-4 text-brand-500 dark:text-brand-400" />
            Basic identification
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Full Name</label>
              <input
                name="name"
                value={profile.name}
                onChange={handleChange}
                placeholder="e.g. Alex Morgan"
                className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Resume / Career Summary Headline</label>
              <input
                name="resume"
                value={profile.resume}
                onChange={handleChange}
                placeholder="e.g. Full-Stack Engineer with 3+ years building cloud-native apps"
                className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>
          </div>
        </div>

        {/* Skills & Preferences */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/80 p-5 shadow-xs dark:shadow-card backdrop-blur-sm">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Compass className="h-4 w-4 text-accent-500 dark:text-accent-400" />
            Skills, target roles & preferences
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Separate multiple entries with commas. These are actively matched against live job listings.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Technical Skills (comma-separated)</label>
              <input
                name="skills"
                value={profile.skills}
                onChange={handleChange}
                placeholder="React, TypeScript, Node.js, Python, PostgreSQL, AWS"
                className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Preferred Target Roles</label>
              <input
                name="preferredRoles"
                value={profile.preferredRoles}
                onChange={handleChange}
                placeholder="Software Engineer, Frontend Developer, Backend Engineer"
                className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Preferred Locations</label>
              <input
                name="preferredLocations"
                value={profile.preferredLocations}
                onChange={handleChange}
                placeholder="San Francisco, New York, London, Remote"
                className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Preferred Employment Types</label>
              <input
                name="preferredJobTypes"
                value={profile.preferredJobTypes}
                onChange={handleChange}
                placeholder="Full-time, Contract, Internship"
                className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">Preferred Work Modes</label>
              <input
                name="preferredWorkModes"
                value={profile.preferredWorkModes}
                onChange={handleChange}
                placeholder="Remote, Hybrid, On-site"
                className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>
          </div>
        </div>

        {/* Social and Portfolio links */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-navy-700/80 bg-white dark:bg-navy-850/80 p-5 shadow-xs dark:shadow-card backdrop-blur-sm">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Globe className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
            Public links & portfolio
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Linkedin className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                name="linkedin"
                value={profile.socialLinks.linkedin}
                onChange={handleSocialLinkChange}
                placeholder="https://linkedin.com/in/..."
                className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 py-2.5 pl-10 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>
            <div className="relative">
              <Github className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                name="github"
                value={profile.socialLinks.github}
                onChange={handleSocialLinkChange}
                placeholder="https://github.com/..."
                className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 py-2.5 pl-10 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>
            <div className="relative">
              <Globe className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <input
                name="portfolio"
                value={profile.socialLinks.portfolio}
                onChange={handleSocialLinkChange}
                placeholder="https://yourportfolio.dev"
                className="w-full rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 py-2.5 pl-10 pr-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>
          </div>
        </div>

        {/* Form Submission */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="accent"
            loading={saving}
          >
            Save Profile Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
