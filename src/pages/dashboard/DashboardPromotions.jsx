import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useTheme } from './Dashboard';
import { Plus, X, Mail, Clock, Ban, Trash2, QrCode, Gift, Send, Loader2, Copy, Check, Power, ExternalLink, Pencil } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog';
import StatsTile from '@/components/dashboard/StatsTile';
import ClientEmailPicker from '@/components/dashboard/ClientEmailPicker';

const inputStyle = {
  background: 'transparent',
  border: 'none',
  borderBottom: '0.5px solid #262626',
  padding: '10px 0',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
  fontFamily: 'var(--font-body)',
};

const pad = (n) => String(n).padStart(2, '0');
const defaultExpiry = (type) => {
  const d = new Date();
  d.setMonth(d.getMonth() + (type === 'voucher' ? 6 : 1));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const toISO = (dateStr) => (dateStr ? new Date(`${dateStr}T00:00:00`).toISOString() : undefined);

const EMPTY_FORM = {
  type: 'voucher',
  code: '',
  value_type: 'amount',
  value: '',
  usage_mode: 'single',
  expires_at: '',
  is_active: true,
  assigned_client_email: '',
  assignment_permanent: false,
  assigned_until: '',
  send_email: false,
  email_to: '',
};

export default function DashboardPromotions() {
  const { theme } = useTheme();
  const t = theme === 'light'
    ? { bg: '#FFFFFF', border: '#E5E5E5', title: '#111111', text: '#111111', muted: 'rgba(0,0,0,0.4)', fuchsia: 'var(--brand)', modalBg: '#FFFFFF' }
    : { bg: 'rgba(10,10,10,0.8)', border: '#262626', title: '#F5F0EB', text: '#F5F0EB', muted: 'rgba(245,240,235,0.4)', fuchsia: 'var(--brand)', modalBg: '#0A0A0A' };

  const [promotions, setPromotions] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('voucher');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editFor, setEditFor] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [graceFor, setGraceFor] = useState(null);
  const [graceForm, setGraceForm] = useState({ grace_value: '', grace_expires_at: '' });
  const [emailFor, setEmailFor] = useState(null);
  const [emailTo, setEmailTo] = useState('');
  const [sending, setSending] = useState(false);
  const [qrFor, setQrFor] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [copied, setCopied] = useState(null);

  const load = async () => {
    const [list, clientList] = await Promise.all([
      base44.entities.Promotion.list('-created_date', 500),
      base44.entities.Client.list('-created_date', 500),
    ]);
    setPromotions(list);
    setClients(clientList);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const computeStatus = (p) => {
    if (p.revoked) return 'revoked';
    const now = Date.now();
    const exp = p.expires_at ? new Date(p.expires_at).getTime() : 0;
    const graceExp = p.grace_expires_at ? new Date(p.grace_expires_at).getTime() : 0;
    if (p.is_grace && graceExp > now) return 'grace';
    if (p.type === 'voucher' && (p.balance || 0) <= 0 && p.used_at) return 'used';
    if (p.type === 'discount' && p.used_at) return 'used';
    if (p.is_active === false) return 'inactive';
    if (exp && exp < now) return 'expired';
    return 'active';
  };

  const STATUS = {
    active: { label: 'AKTYWNY', color: '#16a34a' },
    used: { label: 'WYKORZYSTANY', color: t.muted },
    expired: { label: 'WYGASŁY', color: '#ef4444' },
    grace: { label: 'OSTATNIA SZANSA', color: '#f59e0b' },
    revoked: { label: 'ODWOŁANY', color: '#ef4444' },
    inactive: { label: 'WYŁĄCZONY', color: t.muted },
  };

  const valueStr = (p) => p.value_type === 'percent' ? `${p.value}%` : `${p.value} PLN`;
  const dateStr = (p) => p.expires_at ? new Date(p.expires_at).toLocaleDateString('pl-PL') : '—';

  const openEdit = (p) => {
    setEditFor(p);
    setForm({
      type: p.type,
      code: p.code || '',
      value_type: p.value_type || 'amount',
      value: String(p.value ?? ''),
      usage_mode: p.usage_mode || 'single',
      expires_at: p.expires_at ? p.expires_at.slice(0, 10) : '',
      is_active: p.is_active !== false,
      assigned_client_email: p.assigned_client_email || '',
      assignment_permanent: !!p.assignment_permanent,
      assigned_until: p.assigned_until ? p.assigned_until.slice(0, 10) : '',
      send_email: false,
      email_to: '',
    });
    setCreateOpen(true);
  };

  const closeForm = () => { setCreateOpen(false); setEditFor(null); setForm(EMPTY_FORM); };

  const handleSave = async () => {
    if (!form.value || Number(form.value) <= 0) { toast({ title: 'Podaj wartość', variant: 'destructive' }); return; }
    if (!form.expires_at) { toast({ title: 'Podaj datę ważności', variant: 'destructive' }); return; }
    if (form.send_email && !form.email_to) { toast({ title: 'Podaj e-mail odbiorcy', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      if (editFor) {
        await base44.functions.invoke('managePromotion', {
          action: 'update',
          promotion_id: editFor.id,
          value_type: form.type === 'discount' ? form.value_type : 'amount',
          value: Number(form.value),
          usage_mode: form.usage_mode,
          expires_at: toISO(form.expires_at),
          assigned_client_email: form.assigned_client_email,
          assignment_permanent: form.type === 'voucher' ? true : form.assignment_permanent,
          assigned_until: form.type === 'voucher' ? '' : (form.assigned_until ? toISO(form.assigned_until.slice(0, 10)) : ''),
          is_active: form.type === 'discount' ? form.is_active : undefined,
        });
        toast({ title: 'Zapisano zmiany' });
      } else {
        const res = await base44.functions.invoke('managePromotion', {
          action: 'create',
          type: form.type,
          code: form.code.trim() || undefined,
          value_type: form.value_type,
          value: Number(form.value),
          usage_mode: form.usage_mode,
          expires_at: toISO(form.expires_at),
          assigned_client_email: form.assigned_client_email,
          assignment_permanent: form.assignment_permanent,
          assigned_until: form.assigned_until ? toISO(form.assigned_until.slice(0, 10)) : undefined,
          is_active: form.type === 'discount' ? form.is_active : undefined,
          send_email: form.send_email,
          email_to: form.send_email ? form.email_to : undefined,
        });
        if (res?.data?.email?.error) toast({ title: 'Voucher utworzony, ale e-mail nie wysłany', description: res.data.email.error, variant: 'destructive' });
        else toast({ title: form.type === 'voucher' ? 'Voucher utworzony' : 'Kod zniżkowy utworzony' });
      }
      closeForm();
      load();
    } catch (e) {
      toast({ title: 'Błąd', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (p) => {
    try {
      await base44.functions.invoke('managePromotion', { action: 'revoke', promotion_id: p.id });
      toast({ title: 'Odwołano' });
      load();
    } catch (e) { toast({ title: 'Błąd', description: e.message, variant: 'destructive' }); }
  };

  const toggleActive = async (p) => {
    const next = p.is_active !== false ? false : true;
    try {
      await base44.entities.Promotion.update(p.id, { is_active: next });
      toast({ title: next ? 'Włączono' : 'Wyłączono' });
      load();
    } catch (e) { toast({ title: 'Błąd', description: e.message, variant: 'destructive' }); }
  };

  const handleExtend = async () => {
    if (!graceForm.grace_value || !graceForm.grace_expires_at) { toast({ title: 'Uzupełnij wartość i datę', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      await base44.functions.invoke('managePromotion', {
        action: 'extend_grace',
        promotion_id: graceFor.id,
        grace_value: Number(graceForm.grace_value),
        grace_expires_at: toISO(graceForm.grace_expires_at),
      });
      toast({ title: 'Przedłużono (ostatnia szansa)' });
      setGraceFor(null);
      setGraceForm({ grace_value: '', grace_expires_at: '' });
      load();
    } catch (e) { toast({ title: 'Błąd', description: e.message, variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleSendEmail = async () => {
    if (!emailTo) { toast({ title: 'Podaj e-mail', variant: 'destructive' }); return; }
    setSending(true);
    try {
      const res = await base44.functions.invoke('managePromotion', { action: 'send_email', promotion_id: emailFor.id, to: emailTo });
      if (res?.data?.email?.error) toast({ title: 'E-mail nie wysłany', description: res.data.email.error, variant: 'destructive' });
      else toast({ title: 'E-mail wysłany' });
      setEmailFor(null);
      setEmailTo('');
    } catch (e) { toast({ title: 'Błąd', description: e.message, variant: 'destructive' }); }
    finally { setSending(false); }
  };

  const handleDelete = async (id) => {
    await base44.entities.Promotion.delete(id);
    setPromotions(p => p.filter(x => x.id !== id));
    setDeleteConfirm(null);
  };

  const copyCode = (p) => {
    navigator.clipboard.writeText(p.code).catch(() => {});
    setCopied(p.id);
    setTimeout(() => setCopied(null), 1500);
  };

  const filtered = promotions.filter(p => {
    if (p.type !== view) return false;
    if (filterStatus && computeStatus(p) !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      const email = (p.assigned_client_email || '').toLowerCase();
      const matchesCode = p.code?.toLowerCase().includes(q);
      const matchesEmail = email.includes(q);
      const matchesClient = email && clients.some(c => {
        const cEmail = (c.email || '').toLowerCase();
        if (cEmail !== email) return false;
        const name = `${c.first_name || ''} ${c.last_name || ''} ${c.name || ''}`.toLowerCase();
        return name.includes(q);
      });
      if (!matchesCode && !matchesEmail && !matchesClient) return false;
    }
    return true;
  });

  const label = (text) => (
    <label className="block mb-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{text}</label>
  );
  const inp = (field, type = 'text') => ({
    type,
    style: { ...inputStyle, color: t.text, borderBottomColor: t.border },
    value: form[field] ?? '',
    onChange: e => set(field, e.target.value),
    onFocus: e => e.target.style.borderBottomColor = 'var(--brand)',
    onBlur: e => e.target.style.borderBottomColor = t.border,
  });

  const vouchers = promotions.filter(p => p.type === 'voucher');
  const discounts = promotions.filter(p => p.type === 'discount');
  const stats = [
    { label: 'Vouchery', value: vouchers.length },
    { label: 'Kody zniżkowe', value: discounts.length },
    { label: 'Aktywne', value: promotions.filter(p => computeStatus(p) === 'active').length },
    { label: 'Wygasłe', value: promotions.filter(p => computeStatus(p) === 'expired').length },
  ];

  const statusFilters = view === 'voucher'
    ? ['', 'active', 'inactive', 'used', 'grace', 'expired']
    : ['', 'active', 'inactive', 'used', 'expired'];

  const StatusBadge = ({ st }) => {
    const stInfo = STATUS[st];
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', color: stInfo.color }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '9999px', background: stInfo.color }} />{stInfo.label}
      </span>
    );
  };

  return (
    <div>
      <div className="flex gap-4 mb-6 flex-wrap items-center">
        {stats.map(s => <StatsTile key={s.label} label={s.label} value={s.value} t={t} />)}
        <div className="ml-auto">
          <button onClick={() => { setEditFor(null); setForm({ ...EMPTY_FORM, type: view, expires_at: defaultExpiry(view) }); setCreateOpen(true); }} className="flex items-center gap-2 btn-oxblood" style={{ padding: '8px 16px' }}>
            <Plus size={14} /> {view === 'voucher' ? 'NOWY VOUCHER' : 'NOWY KOD ZNIŻKOWY'}
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex gap-2">
          {[['voucher', 'VOUCHERY'], ['discount', 'KODY ZNIŻKOWE']].map(([v, lbl]) => (
            <button key={v} onClick={() => { setView(v); setFilterStatus(''); }} style={{ border: `0.5px solid ${view === v ? 'var(--brand)' : t.border}`, color: view === v ? 'var(--brand)' : t.muted, background: view === v ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '9px 18px', cursor: 'pointer' }}>{lbl}</button>
          ))}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>STATUS</p>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map(v => (
              <button key={v || 'all'} onClick={() => setFilterStatus(v)} style={{ border: `0.5px solid ${filterStatus === v ? 'var(--brand)' : t.border}`, color: filterStatus === v ? 'var(--brand)' : t.muted, background: filterStatus === v ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '7px 14px', cursor: 'pointer' }}>
                {v === '' ? 'WSZYSTKIE' : STATUS[v].label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 min-w-[200px]">
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>SZUKAJ</p>
          <input type="text" placeholder="Kod lub e-mail..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', background: 'transparent', border: `0.5px solid ${t.border}`, padding: '7px 12px', fontSize: '13px', color: t.text, fontFamily: 'var(--font-body)', outline: 'none' }} onFocus={e => e.target.style.borderColor = 'var(--brand)'} onBlur={e => e.target.style.borderColor = t.border} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-px animate-pulse" style={{ background: t.fuchsia }} /></div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center" style={{ border: `0.5px solid ${t.border}` }}>
          <Gift size={28} color={t.muted} style={{ margin: '0 auto 12px' }} />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: t.muted, letterSpacing: '0.1em' }}>BRAK {view === 'voucher' ? 'VOUCHERÓW' : 'KODÓW'}</p>
        </div>
      ) : view === 'voucher' ? (
        <div style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)' }}>
          <div className="hidden md:grid grid-cols-12 px-4 py-2" style={{ borderBottom: `0.5px solid ${t.border}` }}>
            {['Kod', 'Wartość', 'Saldo', 'Ważny do', 'Status', ''].map((lbl, i) => (
              <span key={i} className={i === 0 ? 'col-span-3' : i === 2 ? 'col-span-1' : i === 5 ? 'col-span-2' : 'col-span-2'} style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{lbl}</span>
            ))}
          </div>
          {filtered.map((p, i) => {
            const st = computeStatus(p);
            const isLast = i === filtered.length - 1;
            const rowBorder = isLast ? 'none' : `0.5px solid ${t.border}`;
            return (
              <div key={p.id} className="grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-3 items-center" style={{ borderBottom: rowBorder }}>
                <div className="col-span-2 md:col-span-3 flex items-center gap-2">
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', letterSpacing: '0.12em', color: t.title, fontWeight: 600 }}>{p.code}</p>
                  <button onClick={() => copyCode(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '2px' }}>
                    {copied === p.id ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                  </button>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--brand)' }}>{valueStr(p)}</p>
                </div>
                <div className="col-span-1 md:col-span-1">
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.muted }}>{p.balance !== undefined && p.balance !== p.value ? `${p.balance} PLN` : '—'}</p>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.muted }}>{dateStr(p)}</p>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <StatusBadge st={st} />
                </div>
                <div className="col-span-2 md:col-span-2 flex flex-wrap items-center gap-1.5 md:justify-end">
                  {p.qr_code_url && <button onClick={() => setQrFor(p)} title="Pokaż QR" style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><QrCode size={13} /></button>}
                  <a href={`${window.location.origin}/voucher/${p.code}`} target="_blank" rel="noopener noreferrer" title="Otwórz stronę vouchera (podgląd klienta)" style={{ color: t.muted, display: 'inline-flex', alignItems: 'center', padding: '4px' }}><ExternalLink size={13} /></a>
                  <button onClick={() => openEdit(p)} title="Edytuj" style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><Pencil size={13} /></button>
                  <button onClick={() => { setEmailFor(p); setEmailTo(p.assigned_client_email || ''); }} title="Wyślij e-mail" style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><Mail size={13} /></button>
                  <button onClick={() => { setGraceFor(p); setGraceForm({ grace_value: String(Math.round((p.balance || p.value) / 2)), grace_expires_at: defaultExpiry('voucher') }); }} title="Przedłuż (ostatnia szansa)" style={{ color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><Clock size={13} /></button>
                  <button onClick={() => toggleActive(p)} title={p.is_active !== false ? 'Wyłącz' : 'Włącz'} style={{ color: p.is_active !== false ? '#16a34a' : t.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><Power size={13} /></button>
                  <button onClick={() => setDeleteConfirm(p)} title="Usuń" style={{ color: t.fuchsia, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><Trash2 size={13} /></button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => {
            const st = computeStatus(p);
            const isActive = p.is_active !== false;
            return (
              <div key={p.id} style={{ border: `0.5px solid ${t.border}`, background: t.bg, borderRadius: 'var(--radius)', padding: '18px', opacity: isActive ? 1 : 0.6 }}>
                <div className="flex items-start justify-between mb-3">
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 7px', border: '0.5px solid rgb(var(--brand-rgb) /0.4)', color: 'var(--brand)' }}>KOD ZNIŻKOWY</span>
                  <StatusBadge st={st} />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', letterSpacing: '0.15em', color: t.title, fontWeight: 600 }}>{p.code}</p>
                  <button onClick={() => copyCode(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.muted, padding: '2px' }}>{copied === p.id ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}</button>
                </div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--brand)', letterSpacing: '0.03em', marginBottom: '12px' }}>{valueStr(p)}</p>
                <div className="space-y-1 mb-3" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: t.muted, letterSpacing: '0.04em' }}>
                  <p>Ważny do: {dateStr(p)}</p>
                  {p.assigned_client_email && <p>Przypisany: {p.assigned_client_email}</p>}
                  {p.assignment_permanent && <p>Przypisanie: stałe</p>}
                  {p.assigned_until && !p.assignment_permanent && <p>Przypisanie do: {new Date(p.assigned_until).toLocaleDateString('pl-PL')}</p>}
                  {p.usage_mode === 'multi' && <p>Tryb: wielorazowy</p>}
                </div>
                <div className="flex flex-wrap gap-2 pt-3" style={{ borderTop: `0.5px solid ${t.border}` }}>
                  <button onClick={() => toggleActive(p)} title={isActive ? 'Wyłącz' : 'Włącz'} style={{ color: isActive ? '#16a34a' : t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><Power size={14} /></button>
                  <a href={`${window.location.origin}/voucher/${p.code}`} target="_blank" rel="noopener noreferrer" title="Otwórz stronę (podgląd klienta)" style={{ color: t.muted, display: 'inline-flex', alignItems: 'center' }}><ExternalLink size={14} /></a>
                  <button onClick={() => openEdit(p)} title="Edytuj" style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><Pencil size={14} /></button>
                  <button onClick={() => { setEmailFor(p); setEmailTo(p.assigned_client_email || ''); }} title="Wyślij e-mail" style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><Mail size={14} /></button>
                  <button onClick={() => setDeleteConfirm(p)} title="Usuń" style={{ color: t.fuchsia, background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto' }}><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteConfirm}
        title="Usuń promocję"
        message={`Czy na pewno usunąć promocję "${deleteConfirm?.code}"?`}
        onConfirm={() => handleDelete(deleteConfirm.id)}
        onCancel={() => setDeleteConfirm(null)}
        theme={theme}
      />

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={closeForm}>
          <div className="w-full max-w-lg max-h-screen overflow-y-auto" style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, padding: '36px', borderRadius: 'var(--radius)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>{editFor ? 'EDYCJA' : 'NOWA PROMOCJA'}</p>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 400, color: t.title, letterSpacing: '0.04em' }}>{form.type === 'voucher' ? 'Voucher' : 'Kod zniżkowy'}{editFor ? ` · ${editFor.code}` : ''}</h3>
              </div>
              <button onClick={closeForm} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div className="space-y-6">
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>TYP</p>
                <div className="flex gap-2">
                  {[['voucher', 'VOUCHER NA OKAZICIELA'], ['discount', 'KOD ZNIŻKOWY']].map(([v, lbl]) => (
                    <button key={v} type="button" disabled={!!editFor} onClick={() => setForm(f => ({ ...f, type: v, value_type: v === 'voucher' ? 'amount' : f.value_type }))} style={{ flex: 1, border: `0.5px solid ${form.type === v ? 'var(--brand)' : t.border}`, color: form.type === v ? 'var(--brand)' : t.muted, background: form.type === v ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px', cursor: editFor ? 'not-allowed' : 'pointer', opacity: editFor ? 0.5 : 1 }}>{lbl}</button>
                  ))}
                </div>
              </div>

              {!editFor && (
                <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>KOD</p>
                  <div>
                    {label('Kod (puste = auto-generacja)')}
                    <input
                      type="text"
                      value={form.code}
                      onChange={e => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      placeholder="np. SUMMER25"
                      maxLength="20"
                      style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, fontFamily: 'var(--font-mono)', letterSpacing: '0.15em' }}
                      onFocus={e => e.target.style.borderBottomColor = 'var(--brand)'}
                      onBlur={e => e.target.style.borderBottomColor = t.border}
                    />
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.05em', marginTop: '8px' }}>Pozostaw puste, aby kod wygenerował się automatycznie.</p>
                  </div>
                </div>
              )}

              <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>WARTOŚĆ</p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    {label('Typ wartości')}
                    <select value={form.value_type} onChange={e => set('value_type', e.target.value)} disabled={form.type === 'voucher'} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: theme === 'light' ? 'light' : 'dark' }}>
                      <option value="amount">Kwota PLN</option>
                      {form.type === 'discount' && <option value="percent">Procent</option>}
                    </select>
                  </div>
                  <div>
                    {label(form.value_type === 'percent' ? 'Procent %' : 'Kwota PLN *')}
                    <input {...inp('value', 'number')} />
                  </div>
                </div>
                <div>
                  {label('Tryb użycia')}
                  <div className="flex gap-2">
                    {[['single', 'JEDNORAZOWY'], ['multi', 'WIELORAZOWY']].map(([v, lbl]) => (
                      <button key={v} type="button" onClick={() => set('usage_mode', v)} style={{ border: `0.5px solid ${form.usage_mode === v ? 'var(--brand)' : t.border}`, color: form.usage_mode === v ? 'var(--brand)' : t.muted, background: form.usage_mode === v ? 'rgb(var(--brand-rgb) /0.08)' : 'transparent', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 14px', cursor: 'pointer' }}>{lbl}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>WAŻNOŚĆ</p>
                <div>{label('Ważny do *')}<input type="date" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: theme === 'light' ? 'light' : 'dark' }} /></div>
                <button type="button" onClick={() => set('expires_at', defaultExpiry(form.type))} className="mt-2" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {form.type === 'voucher' ? 'DOMYŚLNIE +6 MIES.' : 'DOMYŚLNIE +1 MIES.'}
                </button>
              </div>

              {form.type === 'voucher' && editFor && (
                <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>PRZYPISANIE</p>
                  <div className="mb-4">{label('Przypisz do klienta (opcjonalne)')}<ClientEmailPicker value={form.assigned_client_email} onChange={v => set('assigned_client_email', v)} t={t} /></div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: t.muted, letterSpacing: '0.05em' }}>Voucher przypisuje się na stałe — bez daty wygaśnięcia przypisania.</p>
                </div>
              )}

              {form.type === 'discount' && (
                <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--brand)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>USTAWIENIA</p>
                  <div className="mb-4">
                    <button type="button" onClick={() => set('is_active', !form.is_active)} className="flex items-center gap-2" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: form.is_active ? '#16a34a' : t.muted }}>
                      <div style={{ width: '12px', height: '12px', border: `0.5px solid ${form.is_active ? '#16a34a' : t.border}`, background: form.is_active ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{form.is_active && <span style={{ color: '#fff', fontSize: '8px' }}>✓</span>}</div>
                      {form.is_active ? 'Włączony' : 'Wyłączony'}
                    </button>
                  </div>
                  <div className="mb-4">{label('Przypisz do klienta (opcjonalne)')}<ClientEmailPicker value={form.assigned_client_email} onChange={v => set('assigned_client_email', v)} t={t} /></div>
                  <div className="mb-4">
                    <button type="button" onClick={() => set('assignment_permanent', !form.assignment_permanent)} className="flex items-center gap-2" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: form.assignment_permanent ? '#16a34a' : t.muted }}>
                      <div style={{ width: '12px', height: '12px', border: `0.5px solid ${form.assignment_permanent ? '#16a34a' : t.border}`, background: form.assignment_permanent ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{form.assignment_permanent && <span style={{ color: '#fff', fontSize: '8px' }}>✓</span>}</div>
                      Przypisanie stałe
                    </button>
                  </div>
                  {!form.assignment_permanent && (
                    <div>{label('Przypisany do (data)')}<input type="date" value={form.assigned_until ? form.assigned_until.slice(0, 10) : ''} onChange={e => set('assigned_until', e.target.value)} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: theme === 'light' ? 'light' : 'dark' }} /></div>
                  )}
                </div>
              )}

              {!editFor && (
                <div style={{ borderTop: `0.5px solid ${t.border}`, paddingTop: '20px' }}>
                  <button type="button" onClick={() => set('send_email', !form.send_email)} className="flex items-center gap-2 mb-3" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: form.send_email ? '#16a34a' : t.muted }}>
                    <div style={{ width: '12px', height: '12px', border: `0.5px solid ${form.send_email ? '#16a34a' : t.border}`, background: form.send_email ? '#16a34a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{form.send_email && <span style={{ color: '#fff', fontSize: '8px' }}>✓</span>}</div>
                    Wyślij e-mailem po utworzeniu
                  </button>
                  {form.send_email && <div>{label('E-mail odbiorcy *')}<ClientEmailPicker value={form.email_to} onChange={v => set('email_to', v)} t={t} /></div>}
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-8 pt-6" style={{ borderTop: `0.5px solid ${t.border}` }}>
              <button onClick={handleSave} disabled={saving} className="btn-oxblood flex-1 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={13} className="animate-spin" /> : editFor ? <Pencil size={13} /> : <Gift size={13} />} {saving ? 'ZAPISYWANIE...' : editFor ? 'ZAPISZ' : 'UTWÓRZ'}
              </button>
              <button onClick={closeForm} className="btn-ghost-parchment">ANULUJ</button>
            </div>
          </div>
        </div>
      )}

      {graceFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setGraceFor(null)}>
          <div className="w-full max-w-md" style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, padding: '32px', borderRadius: 'var(--radius)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#f59e0b', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>OSTATNIA SZANSA</p>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 400, color: t.title }}>{graceFor.code}</h3>
              </div>
              <button onClick={() => setGraceFor(null)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: '13px', color: t.muted, marginBottom: '20px', lineHeight: 1.5 }}>Przedłuż ważność vouchera z obniżoną wartością (np. 50%).</p>
            <div className="space-y-4">
              <div>{label('Nowa wartość (PLN) *')}<input type="number" min="0" step="0.01" value={graceForm.grace_value} onChange={e => setGraceForm(f => ({ ...f, grace_value: e.target.value }))} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border }} /></div>
              <div>{label('Ważny do *')}<input type="date" value={graceForm.grace_expires_at} onChange={e => setGraceForm(f => ({ ...f, grace_expires_at: e.target.value }))} style={{ ...inputStyle, color: t.text, borderBottomColor: t.border, colorScheme: theme === 'light' ? 'light' : 'dark' }} /></div>
            </div>
            <div className="flex gap-4 mt-8 pt-6" style={{ borderTop: `0.5px solid ${t.border}` }}>
              <button onClick={handleExtend} disabled={saving} className="btn-oxblood flex-1 flex items-center justify-center gap-2">{saving ? <Loader2 size={13} className="animate-spin" /> : <Clock size={13} />} PRZEDŁUŻ</button>
              <button onClick={() => setGraceFor(null)} className="btn-ghost-parchment">ANULUJ</button>
            </div>
          </div>
        </div>
      )}

      {emailFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setEmailFor(null)}>
          <div className="w-full max-w-md" style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, padding: '32px', borderRadius: 'var(--radius)' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 400, color: t.title }}>Wyślij e-mailem</h3>
              <button onClick={() => setEmailFor(null)} style={{ color: t.muted, background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: '13px', color: t.muted, marginBottom: '16px' }}>{emailFor.code} · {valueStr(emailFor)}</p>
            <div>{label('E-mail odbiorcy *')}<ClientEmailPicker value={emailTo} onChange={setEmailTo} t={t} /></div>
            <div className="flex gap-4 mt-8 pt-6" style={{ borderTop: `0.5px solid ${t.border}` }}>
              <button onClick={handleSendEmail} disabled={sending} className="btn-oxblood flex-1 flex items-center justify-center gap-2">{sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} WYŚLIJ</button>
              <button onClick={() => setEmailFor(null)} className="btn-ghost-parchment">ANULUJ</button>
            </div>
          </div>
        </div>
      )}

      {qrFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setQrFor(null)}>
          <div className="flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setQrFor(null)} style={{ alignSelf: 'flex-end', color: t.muted, background: 'none', border: 'none', cursor: 'pointer', marginBottom: '12px' }}><X size={22} /></button>
            <div style={{ border: `0.5px solid ${t.border}`, background: t.modalBg, padding: '24px', borderRadius: 'var(--radius)' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--brand)', letterSpacing: '0.2em', textTransform: 'uppercase', textAlign: 'center', marginBottom: '8px' }}>VOUCHER · {qrFor.code}</p>
              {qrFor.qr_code_url && <img src={qrFor.qr_code_url} alt="QR" style={{ width: '260px', height: '260px', display: 'block', margin: '0 auto' }} />}
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--brand)', textAlign: 'center', marginTop: '12px' }}>{valueStr(qrFor)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}