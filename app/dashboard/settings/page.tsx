"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Lock, Clock, MapPin, Bell, PenLine, Loader2, X, Plus, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/components/LanguageProvider";

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const [notifications, setNotifications] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ... (existing state)
  const [settings, setSettings] = useState({
    company_name: '',
    company_logo: '', // Add logo state
    check_in_radius: '100',
    late_tolerance: '15',
    office_start_time: '09:00 AM',
    office_end_time: '05:00 PM'
  });

  // ... (existing helper functions)

  useEffect(() => {
    fetchSettings();
    fetchRoles();
  }, []);

  // Role Management Logic
  const [roles, setRoles] = useState<any[]>([]);
  const [newRole, setNewRole] = useState("");

  const fetchRoles = async () => {
      try {
          const res = await fetch('/api/roles');
          if (res.ok) setRoles(await res.json());
      } catch (e) {
          console.error("Failed to fetch roles");
      }
  };

  const handleAddRole = async () => {
      if (!newRole.trim()) return;
      try {
          const res = await fetch('/api/roles', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: newRole })
          });
          if (res.ok) {
              setNewRole("");
              fetchRoles();
              alert("Role added successfully");
          } else {
              alert("Failed to add role (maybe duplicate?)");
          }
      } catch (e) {
          alert("Error adding role");
      }
  };

  const handleDeleteRole = async (id: string) => {
      if(!confirm("Are you sure? This role will be removed from future selection.")) return;
      try {
          const res = await fetch(`/api/roles/${id}`, { method: 'DELETE' });
          if (res.ok) {
              fetchRoles();
          } else {
              alert("Failed to delete role");
          }
      } catch (e) {
          alert("Error deleting role");
      }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (!data.error) {
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, company_logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });

        if (res.ok) {
            alert('Settings Saved Successfully!');
        } else {
            alert('Failed to save settings');
        }
    } catch (err) {
        alert('Error saving settings');
    } finally {
        setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-white">Loading settings...</div>;

  return (
    <div className="p-8 space-y-8 min-h-screen bg-zinc-950 text-white max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
           <h1 className="text-3xl font-bold tracking-tight">{t('appSettings')}</h1>
           <p className="text-zinc-400 mt-1">{t('appSettingsDesc')}</p>
        </div>
        <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#13ec6d] text-black hover:bg-[#13ec6d]/90 font-bold h-12 px-6"
        >
           {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
           {saving ? t('saving') : t('saveChanges')}
        </Button>
      </div>

      <div className="space-y-6">

        {/* Language Settings */}
        <div>
           <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
             <Globe className="h-5 w-5 text-[#13ec6d]" /> {t('language')}
           </h2>
           <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <div className="space-y-2">
                 <Label>{t('selectLanguage')}</Label>
                 <div className="flex gap-4">
                     <button
                        onClick={() => setLanguage('en')}
                        className={`flex-1 p-4 rounded-xl border transition-all ${language === 'en' ? 'bg-[#13ec6d]/10 border-[#13ec6d] text-[#13ec6d]' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                     >
                        <span className="font-bold block mb-1">English</span>
                        <span className="text-xs opacity-70">Default</span>
                     </button>
                     <button
                        onClick={() => setLanguage('id')}
                        className={`flex-1 p-4 rounded-xl border transition-all ${language === 'id' ? 'bg-[#13ec6d]/10 border-[#13ec6d] text-[#13ec6d]' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                     >
                        <span className="font-bold block mb-1">Bahasa Indonesia</span>
                        <span className="text-xs opacity-70">Terjemahan</span>
                     </button>
                 </div>
              </div>
           </div>
        </div>

        {/* General Settings */}
        <div>
           <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
             <PenLine className="h-5 w-5 text-[#13ec6d]" /> {t('generalSettings')}
           </h2>
           <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-6">
              <div className="space-y-2">
                 <Label>{t('companyName')}</Label>
                 <Input
                    value={settings.company_name}
                    onChange={(e) => handleChange('company_name', e.target.value)}
                    className="bg-zinc-950/50 border-zinc-800 focus:border-[#13ec6d]"
                 />
              </div>

              <div className="space-y-2">
                 <Label>{t('appLogo')}</Label>
                 <div className="flex items-center gap-4 p-4 border border-dashed border-zinc-700 rounded-xl bg-zinc-950/30">
                    <div className="h-16 w-16 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 overflow-hidden relative">
                       {settings.company_logo ? (
                           <img src={settings.company_logo} alt="Logo" className="h-full w-full object-contain" />
                       ) : (
                           <span className="text-xs">No Logo</span>
                       )}
                    </div>
                    <div className="flex-1">
                       <p className="text-sm font-medium text-white">{settings.company_logo ? t('logoUploaded') : t('uploadLogo')}</p>
                       <p className="text-xs text-zinc-500">Max file size: 2MB (Base64 Storage)</p>
                    </div>
                    <div className="relative">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Button variant="outline" size="sm" className="border-zinc-700 bg-zinc-800 text-white pointer-events-none">Replace</Button>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Attendance Rules */}
        <div>
           <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
             <MapPin className="h-5 w-5 text-[#13ec6d]" /> {t('attendanceRules')}
           </h2>
           <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label className="flex justify-between">{t('checkInRadius')} <span className="text-zinc-500 text-xs font-normal">(meters)</span></Label>
                    <div className="relative">
                       <Input
                            value={settings.check_in_radius}
                            onChange={(e) => handleChange('check_in_radius', e.target.value)}
                            className="pr-16 bg-zinc-950/50 border-zinc-800 focus:border-[#13ec6d] text-right font-mono"
                       />
                       <span className="absolute right-3 top-2.5 text-xs text-zinc-500">meters</span>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <Label className="flex justify-between">{t('lateTolerance')} <span className="text-zinc-500 text-xs font-normal">(minutes)</span></Label>
                    <div className="relative">
                       <Input
                            value={settings.late_tolerance}
                            onChange={(e) => handleChange('late_tolerance', e.target.value)}
                            className="pr-16 bg-zinc-950/50 border-zinc-800 focus:border-[#13ec6d] text-right font-mono"
                        />
                       <span className="absolute right-3 top-2.5 text-xs text-zinc-500">minutes</span>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-800/50">
                 <div className="space-y-2">
                    <Label>{t('officeStartTime')}</Label>
                    <div className="relative">
                       <Clock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                       <Input
                            value={settings.office_start_time}
                            onChange={(e) => handleChange('office_start_time', e.target.value)}
                            className="pl-10 bg-zinc-950/50 border-zinc-800 focus:border-[#13ec6d]"
                        />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <Label>{t('officeEndTime')}</Label>
                    <div className="relative">
                       <Clock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                       <Input
                            value={settings.office_end_time}
                            onChange={(e) => handleChange('office_end_time', e.target.value)}
                            className="pl-10 bg-zinc-950/50 border-zinc-800 focus:border-[#13ec6d]"
                       />
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Role Management */}
        <div>
           <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
             <div className="bg-[#13ec6d] rounded-full p-1"><Lock className="h-3 w-3 text-black" /></div> {t('roleManagement')}
           </h2>
           <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-6">
                <div className="space-y-4">
                    <Label>{t('activeRoles')}</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {roles.map((role: any) => (
                            <div key={role.id} className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
                                <span className="capitalize text-sm font-medium">{role.name}</span>
                                {role.is_default ? (
                                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">System</span>
                                ) : (
                                    <button
                                        onClick={() => handleDeleteRole(role.id)}
                                        className="text-zinc-500 hover:text-red-500 transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="pt-4 border-t border-zinc-800">
                    <Label className="mb-2 block">{t('addRole')}</Label>
                    <div className="flex gap-3">
                        <Input
                            placeholder="e.g. Manager, HR, Intern"
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="bg-zinc-950/50 border-zinc-800 focus:border-[#13ec6d]"
                        />
                         <Button
                            onClick={handleAddRole}
                            disabled={!newRole.trim()}
                            className="bg-zinc-800 hover:bg-[#13ec6d] hover:text-black text-white font-medium"
                        >
                           <Plus className="h-4 w-4 mr-2" />
                           {t('addRole')}
                        </Button>
                    </div>
                </div>
           </div>
        </div>

        {/* Notification Settings */}
        <div>
           <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
             <Bell className="h-5 w-5 text-[#13ec6d]" /> {t('notificationSettings')}
           </h2>
           <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                 <div>
                    <h3 className="font-medium text-white">{t('lateCheckInAlerts')}</h3>
                    <p className="text-sm text-zinc-400">Notify admins immediately when an employee is late.</p>
                 </div>
                 <button
                  onClick={() => setNotifications(!notifications)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${notifications ? 'bg-[#13ec6d]' : 'bg-zinc-700'}`}
                 >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${notifications ? 'translate-x-6' : 'translate-x-0'}`} />
                 </button>
              </div>
           </div>
        </div>
      </div>

       <div className="text-center text-zinc-500 text-sm pt-8">
          Absensi Fajar Admin Portal v1.0.0
       </div>
    </div>
  );
}
