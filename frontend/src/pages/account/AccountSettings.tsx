import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft } from "lucide-react";
import type { AccountProfile, AccountMeResponse, UpdateAccountData } from "@/services/accountService";
import { getAccountMe, updateAccount } from "@/services/accountService";
import Header from "@/components/Header";
import SEO from "@/components/SEO";
import MobileNav from "@/components/MobileNav";

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-semibold text-gray-900 mb-4">{children}</h2>
);

type EditableRowProps = {
  label: string;
  value?: string | null;
  placeholder?: string;
  type?: "text" | "email" | "tel";
  onSave: (val: string) => Promise<void> | void;
};

const EditableRow = ({ label, value, placeholder, type = "text", onSave }: EditableRowProps) => {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value || "");
  useEffect(() => setTemp(value || ""), [value]);

  return (
    <div className="py-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-gray-500">{label}</div>
          {!editing ? (
            <div className="font-medium text-gray-900">{value || "Not provided"}</div>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <Input value={temp} onChange={(e) => setTemp(e.target.value)} placeholder={placeholder} type={type} className="max-w-md" />
              <Button size="sm" onClick={async () => { await onSave(temp.trim()); setEditing(false); }}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => { setTemp(value || ""); setEditing(false); }}>Cancel</Button>
            </div>
          )}
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-sm font-medium text-gray-900 hover:underline">{value ? "Edit" : "Add"}</button>
        )}
      </div>
    </div>
  );
};

const SelectRow = ({ label, value, options, onSave }: { label: string; value?: string | null; options: { value: string; label: string }[]; onSave: (val: string) => Promise<void> | void; }) => {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value || "");
  useEffect(() => setTemp(value || ""), [value]);
  const currentLabel = options.find(o => o.value === value)?.label || value || "Not provided";
  return (
    <div className="py-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-gray-500">{label}</div>
          {!editing ? (
            <div className="font-medium text-gray-900">{currentLabel}</div>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <Select value={temp} onValueChange={setTemp}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {options.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={async () => { await onSave(temp); setEditing(false); }}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => { setTemp(value || ""); setEditing(false); }}>Cancel</Button>
            </div>
          )}
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-sm font-medium text-gray-900 hover:underline">{value ? "Edit" : "Add"}</button>
        )}
      </div>
    </div>
  );
};

const AccountSettings = () => {
  const [data, setData] = useState<AccountMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    (async () => {
      try {
        const me = await getAccountMe();

        // Load locally saved data if API data is missing
        const savedLocation = localStorage.getItem('host_location');
        const savedLanguages = localStorage.getItem('host_languages');
        const savedAvatar = localStorage.getItem('host_avatar');

        if (me.profile) {
          if (savedLocation) me.profile.location = savedLocation;
          if (savedLanguages) me.profile.languages_spoken = savedLanguages;
        }

        setData(me);
        setError(null);
      } catch (err: unknown) {
        let msg = 'Failed to load account';
        if (err && typeof err === 'object' && 'response' in err) {
          const resp = (err as { response?: { data?: { error?: string; message?: string } } }).response;
          const data = resp?.data;
          msg = data?.error || data?.message || msg;
        } else if (err instanceof Error) {
          msg = err.message;
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Handle deep-linking to sections (e.g., ?tab=languages)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "languages") {
      const el = document.getElementById("languages-section");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [searchParams]);

  const sections = [
    { id: "personal", label: "Personal information" },
    { id: "notifications", label: "Notifications" },
    { id: "privacy", label: "Privacy" },
    { id: "taxes", label: "Taxes" },
    { id: "payments", label: "Payments" },
    { id: "languages", label: "Languages & currency" },
    { id: "travel", label: "Travel for work" },
  ];

  if (loading) return <div className="p-6">Loading...</div>;
  if (!data) return <div className="p-6">{error || "Unable to load account."}</div>;

  const p: AccountProfile = data.profile || ({} as AccountProfile);

  const save = async (
    patch: UpdateAccountData
  ) => {
    // Persist to localStorage for demo purposes
    if (patch.location !== undefined) localStorage.setItem('host_location', patch.location);
    if (patch.languages_spoken !== undefined) localStorage.setItem('host_languages', patch.languages_spoken);

    await updateAccount(patch);
    const fresh = await getAccountMe();

    // Re-apply local data
    const savedLocation = localStorage.getItem('host_location');
    const savedLanguages = localStorage.getItem('host_languages');
    if (fresh.profile) {
      if (savedLocation) fresh.profile.location = savedLocation;
      if (savedLanguages) fresh.profile.languages_spoken = savedLanguages;
    }

    setData(fresh);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        localStorage.setItem('host_avatar', base64String);
        // Force update to show new avatar immediately (in a real app, we'd upload to server)
        window.location.reload();
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-20 md:pb-0">
      <SEO title="Account Settings" description="Manage your personal information and preferences." />
      <Header />
      <div className="max-w-6xl mx-auto px-6 py-6 pt-10 md:pt-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="md:col-span-1 space-y-2">
            {sections.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => {
                  const el = document.getElementById(`${s.id}-section`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 ${idx === 0 ? 'bg-gray-100 font-semibold' : ''}`}
              >
                {s.label}
              </button>
            ))}
          </aside>

          {/* Content */}
          <main className="md:col-span-3">
            <div className="flex items-center gap-2 mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="rounded-full shrink-0"
                aria-label="Go back"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <div className="flex items-center justify-between flex-1">
                <h1 className="text-2xl font-semibold">Personal information</h1>
                <Button variant="outline" onClick={() => navigate(-1)}>Done</Button>
              </div>
            </div>

            <div id="personal-section" className="bg-white border border-gray-200 rounded-xl p-4">
              <SectionTitle>Personal information</SectionTitle>
              <Separator />
              <div className="py-4 flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Profile Picture</div>
                  <div className="mt-2">
                    {localStorage.getItem('host_avatar') ? (
                      <img src={localStorage.getItem('host_avatar')!} alt="Profile" className="h-16 w-16 rounded-full object-cover" />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">No Img</div>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <Button variant="outline" size="sm">Upload</Button>
                </div>
              </div>
              <Separator />
              <EditableRow label="Legal name" value={p.legal_name || undefined} onSave={(val) => save({ legal_name: val })} />
              <Separator />
              <EditableRow label="Preferred first name" value={p.preferred_first_name || undefined} onSave={(val) => save({ preferred_first_name: val })} />
              <Separator />
              <EditableRow label="Email address" value={data.user.email} type="email" onSave={(val) => save({ email: val })} />
              <Separator />
              <EditableRow label="Phone numbers" value={p.phone || undefined} type="tel" onSave={(val) => save({ phone: val })} />
              <Separator />
              <EditableRow label="Residential address" value={p.residential_address || undefined} onSave={(val) => save({ residential_address: val })} />
              <Separator />
              <EditableRow label="Mailing address" value={p.mailing_address || undefined} onSave={(val) => save({ mailing_address: val })} />
              <Separator />
              <EditableRow label="Where I live" value={p.location || undefined} onSave={(val) => save({ location: val })} />
              <Separator />
              <EditableRow label="Languages I speak" value={p.languages_spoken || undefined} onSave={(val) => save({ languages_spoken: val })} />

            </div>

            <div id="notifications-section" className="bg-white border border-gray-200 rounded-xl p-4 mt-6">
              <SectionTitle>Notifications</SectionTitle>
              <Separator />
              <div className="py-4 flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Email notifications</div>
                  <div className="font-medium text-gray-900">Receive updates by email</div>
                </div>
                <Switch checked={!!p.notify_email} onCheckedChange={(val) => save({ notify_email: val })} />
              </div>
              <Separator />
              <div className="py-4 flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">SMS notifications</div>
                  <div className="font-medium text-gray-900">Receive updates by SMS</div>
                </div>
                <Switch checked={!!p.notify_sms} onCheckedChange={(val) => save({ notify_sms: val })} />
              </div>
            </div>

            <div id="privacy-section" className="bg-white border border-gray-200 rounded-xl p-4 mt-6">
              <SectionTitle>Privacy</SectionTitle>
              <Separator />
              <SelectRow
                label="Profile visibility"
                value={p.privacy_profile_visibility || undefined}
                options={[
                  { value: "everyone", label: "Everyone" },
                  { value: "guests", label: "Guests" },
                  { value: "private", label: "Only me" },
                ]}
                onSave={(val) => save({ privacy_profile_visibility: val })}
              />
            </div>

            <div id="taxes-section" className="bg-white border border-gray-200 rounded-xl p-4 mt-6">
              <SectionTitle>Taxes</SectionTitle>
              <Separator />
              <EditableRow label="Tax ID" value={p.tax_id || undefined} onSave={(val) => save({ tax_id: val })} />
            </div>

            <div id="payments-section" className="bg-white border border-gray-200 rounded-xl p-4 mt-6">
              <SectionTitle>Payments</SectionTitle>
              <Separator />
              <EditableRow label="Payout method" value={p.payout_method || undefined} onSave={(val) => save({ payout_method: val })} />
            </div>

            <div id="languages-section" className="bg-white border border-gray-200 rounded-xl p-4 mt-6">
              <SectionTitle>Languages & currency</SectionTitle>
              <Separator />
              <SelectRow
                label="Language"
                value={p.language || undefined}
                options={[
                  { value: "en", label: "English" },
                  { value: "fr", label: "Français" },
                ]}
                onSave={(val) => save({ language: val })}
              />
              <Separator />
              <SelectRow
                label="Currency"
                value={p.currency || "XAF"}
                options={[
                  { value: "XAF", label: "FCFA (XAF)" },
                  { value: "USD", label: "USD" },
                  { value: "EUR", label: "EUR" },
                ]}
                onSave={(val) => save({ currency: val })}
              />
            </div>

            <div id="travel-section" className="bg-white border border-gray-200 rounded-xl p-4 mt-6">
              <SectionTitle>Travel for work</SectionTitle>
              <Separator />
              <div className="py-4 flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Enable travel for work</div>
                  <div className="font-medium text-gray-900">Show business travel tools</div>
                </div>
                <Switch checked={!!p.travel_for_work} onCheckedChange={(val) => save({ travel_for_work: val })} />
              </div>
            </div>
          </main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
};

export default AccountSettings;
