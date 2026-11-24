import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ReportPage from './pages/ReportPage';
import BillingPage from './pages/BillingPage';

// SYNTHETIC sample data for marketing screenshots only. No real owners.
const t = new Date();
const iso = (d: number) => { const x = new Date(t.getFullYear(), t.getMonth(), t.getDate() + d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };
const ts = (d: number, h = 10) => { const x = new Date(t.getFullYear(), t.getMonth(), t.getDate() + d, h); return x.toISOString(); };
const base = { project_id: 'p1', email: null, address: null, notes: null, last_contacted_at: null, extra_phones: [], phone_wrong: false, do_not_contact: false, next_contact_date: null, offer_terms_id: null, bonus_paid_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' };
const O = (id: string, name: string, nma: number, status: string, o: any = {}) => ({ ...base, id, name, nma, interest_decimal: nma / 160, phone: '(405) 555-01' + id.slice(1).padStart(2, '0'), status, ...o });
const owners = [
  O('o1', 'Harlan Family Trust', 38.4, 'leased', { bonus_paid_at: iso(-6), last_contacted_at: ts(-12) }),
  O('o2', 'Mesa Verde Minerals, LLC', 32.0, 'leased', { last_contacted_at: ts(-9) }),
  O('o3', 'Estate of R. T. Calloway', 24.8, 'negotiating', { next_contact_date: iso(1), last_contacted_at: ts(-2) }),
  O('o4', 'Wren Creek Royalty, LP', 20.0, 'offer_made', { next_contact_date: iso(0), last_contacted_at: ts(-4), address: '1200 Mercer Ave\nOklahoma City, OK 73102' }),
  O('o5', 'Dolores M. Aldana', 16.0, 'contacted', { next_contact_date: iso(-2), last_contacted_at: ts(-5) }),
  O('o6', 'Thornfield Holdings', 12.8, 'attempted', { next_contact_date: iso(-1), last_contacted_at: ts(-3) }),
  O('o7', 'J. & L. Okafor Living Trust', 10.0, 'attempted', { next_contact_date: iso(2), last_contacted_at: ts(-1) }),
  O('o8', 'Pruitt Mineral Partners', 8.0, 'not_contacted'),
  O('o9', 'Samuel E. Brandt', 6.4, 'not_contacted'),
  O('o10', 'Lakeshore Energy Trust', 5.0, 'declined', { last_contacted_at: ts(-7) }),
  O('o11', 'Marguerite Voss', 4.0, 'not_contacted'),
  O('o12', 'Ridgeline Land Co.', 3.2, 'unresponsive', { last_contacted_at: ts(-10) }),
  O('o13', 'Teodoro & Ana Villareal', 2.4, 'not_contacted'),
  O('o14', 'Hollis Basin Interests', 1.6, 'not_contacted'),
  O('o15', 'C. R. Whitlock Estate', 1.2, 'contacted', { next_contact_date: iso(4), last_contacted_at: ts(-1) }),
  O('o16', 'Nell P. Sutter', 0.8, 'not_contacted'),
];
const db: Record<string, any[]> = {
  projects: [{ id: 'p1', name: 'Sample Prospect', prospect_number: '26-001', target_area: 'SE/4', section: '14', township: '21N', range: '4W', county: 'Grady', notes: null, operator_name: 'Example Operating, LLC', offer_valid_days: 14, hourly_rate: 85, mileage_rate: 0.7, is_archived: false, created_at: '2026-01-01T00:00:00Z', updated_at: '' }],
  project_offer_terms: [
    { id: 't1', project_id: 'p1', label: 'Standard', rate_per_acre: 150, royalty_label: '3/16', royalty_fraction: 0.1875, lease_term_months: 12, option_to_extend: true, sort_order: 0, created_at: '' },
    { id: 't2', project_id: 'p1', label: 'Premium', rate_per_acre: 175, royalty_label: '1/4', royalty_fraction: 0.25, lease_term_months: 12, option_to_extend: false, sort_order: 1, created_at: '' },
  ],
  landman_profile: [{ id: 'lp', full_name: 'Alex Rivera', title: 'Landman', phone: '405-555-0142', email: 'alex@example.com' }],
  mineral_owners: owners,
  owner_activity: [
    { id: 'a1', owner_id: 'o3', note: 'Spoke with them — wants to see the royalty in writing', outcome: 'Spoke with them', created_at: ts(-2) },
    { id: 'a2', owner_id: 'o4', note: 'Offer letter prepared (Standard)', outcome: 'Offer letter', created_at: ts(-4) },
    { id: 'a3', owner_id: 'o6', note: 'No answer', outcome: 'No answer', created_at: ts(-3) },
    { id: 'a4', owner_id: 'o5', note: 'Left voicemail', outcome: 'Left voicemail', created_at: ts(-5) },
    { id: 'a5', owner_id: 'o1', note: 'Interested — signed lease returned', outcome: 'Interested', created_at: ts(-12) },
  ],
  project_billing_entries: [
    { id: 'b1', project_id: 'p1', entry_date: iso(-9), kind: 'hours', quantity: 3.5, amount: null, description: 'Calls to mineral owners', invoice_number: null, billed_at: null, created_at: '1' },
    { id: 'b2', project_id: 'p1', entry_date: iso(-8), kind: 'miles', quantity: 112, amount: null, description: 'Courthouse run, county clerk', invoice_number: null, billed_at: null, created_at: '2' },
    { id: 'b3', project_id: 'p1', entry_date: iso(-5), kind: 'hours', quantity: 4, amount: null, description: 'Offer letters + follow-up calls', invoice_number: null, billed_at: null, created_at: '3' },
    { id: 'b4', project_id: 'p1', entry_date: iso(-2), kind: 'expense', quantity: 0, amount: 24, description: 'Certified copies', invoice_number: null, billed_at: null, created_at: '4' },
  ],
  owner_files: [{ id: 'f1', owner_id: 'o1', name: 'Executed lease — Harlan Family Trust.pdf', path: 'x', size: 412000, content_type: 'application/pdf', created_at: ts(-6) }],
};
(supabase as any).storage = { from: () => ({ upload: async () => ({ error: null }), remove: async () => ({ error: null }), createSignedUrl: async () => ({ data: null, error: null }) }) };
(supabase as any).from = (table: string) => {
  const st: any = { op: 'select', filters: [] as any[], single: false };
  const b: any = {
    select: () => b, order: () => b, limit: () => b, gte: () => b, eq: (k: string, v: any) => (st.filters.push([k, [v]]), b), in: (k: string, v: any[]) => (st.filters.push([k, v]), b),
    insert: (p: any) => ((st.op = 'insert'), (st.payload = p), b), update: (p: any) => ((st.op = 'update'), (st.payload = p), b),
    delete: () => ((st.op = 'delete'), b), single: () => ((st.single = true), b),
    then: (res: any, rej: any) => Promise.resolve(run()).then(res, rej),
  };
  const match = (r: any) => st.filters.every(([k, v]: any) => v.includes(r[k]));
  function run() {
    let rows: any[];
    if (table === 'latest_owner_activity') {
      const m = new Map<string, any>(); for (const a of db.owner_activity) if (!m.has(a.owner_id)) m.set(a.owner_id, a); rows = [...m.values()];
    } else if (st.op === 'insert') { const arr = Array.isArray(st.payload) ? st.payload : [st.payload]; rows = arr.map((p: any) => ({ id: 'n' + Math.random(), created_at: new Date().toISOString(), ...p })); db[table] = db[table] ?? []; db[table].push(...rows); }
    else if (st.op === 'update') { rows = db[table].filter(match); rows.forEach((r) => Object.assign(r, st.payload)); }
    else if (st.op === 'delete') { db[table] = db[table].filter((r) => !match(r)); rows = []; }
    else rows = (db[table] ?? []).filter(match);
    rows = rows.map((r) => ({ ...r }));
    return { data: st.single ? rows[0] : rows, error: null, count: rows.length };
  }
  return b;
};
export default function ScratchShots() {
  const path = new URLSearchParams(location.search).get('path') || '/';
  return (
    <MemoryRouter initialEntries={[path]}>
      <div className="flex h-screen flex-col overflow-hidden bg-stone-50 dark:bg-stone-950 md:flex-row">
        <Sidebar email="alex@example.com" />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/projects/:id/report" element={<ReportPage />} />
            <Route path="/projects/:id/billing" element={<BillingPage />} />
          </Routes>
        </main>
      </div>
    </MemoryRouter>
  );
}
