import { useEffect, useState } from 'react';
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
      alert('Profile updated successfully');
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center text-slate-300">Loading profile…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm uppercase tracking-[0.2em] text-sky-300">Profile</div>
        <h1 className="mt-2 text-3xl font-semibold text-white">Career profile</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-soft">
          <div className="text-lg font-semibold text-white">Basic information</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-slate-300">Name</label>
              <input name="name" value={profile.name} onChange={handleChange} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-500" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Resume</label>
              <input name="resume" value={profile.resume} onChange={handleChange} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-500" placeholder="Resume summary" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-soft">
          <div className="text-lg font-semibold text-white">Skills & preferences</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-slate-300">Skills</label>
              <input name="skills" value={profile.skills} onChange={handleChange} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-500" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Preferred roles</label>
              <input name="preferredRoles" value={profile.preferredRoles} onChange={handleChange} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-500" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Preferred locations</label>
              <input name="preferredLocations" value={profile.preferredLocations} onChange={handleChange} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-500" />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Preferred job types</label>
              <input name="preferredJobTypes" value={profile.preferredJobTypes} onChange={handleChange} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-500" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-slate-300">Preferred work modes</label>
              <input name="preferredWorkModes" value={profile.preferredWorkModes} onChange={handleChange} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-500" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-soft">
          <div className="text-lg font-semibold text-white">Social links</div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <input name="linkedin" value={profile.socialLinks.linkedin} onChange={handleSocialLinkChange} placeholder="LinkedIn" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-500" />
            <input name="github" value={profile.socialLinks.github} onChange={handleSocialLinkChange} placeholder="GitHub" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-500" />
            <input name="portfolio" value={profile.socialLinks.portfolio} onChange={handleSocialLinkChange} placeholder="Portfolio" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-500" />
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="rounded-xl bg-sky-500 px-5 py-2.5 font-medium text-slate-950 hover:bg-sky-400">Save profile</button>
        </div>
      </form>
    </div>
  );
}
