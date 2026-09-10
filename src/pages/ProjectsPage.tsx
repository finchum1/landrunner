import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createProject, fetchProjects, type ProjectInput } from '../lib/projects';
import { fetchAllOwnersLite } from '../lib/owners';
import { createOfferTerms, fetchAllOfferTermsLite, type OfferTermsInput } from '../lib/offerTerms';
import type { Project } from '../lib/types';
import { formatAcres, formatLeaseTerm, formatMoney, legalDescription } from '../lib/format';
import ProjectFormModal from '../components/ProjectFormModal';

interface ProjectStats {
  ownerCount: number;
  totalNma: number;
  leasedNma: number;
  leasedCount: number;
}

interface TermsPreview {
  label: string | null;
  rate_per_acre: number | null;
  royalty_label: string | null;
  lease_term_months: number | null;
  extraCount: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<Record<string, ProjectStats>>({});
  const [termsPreview, setTermsPreview] = useState<Record<string, TermsPreview>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setError(null);
    try {
      const [projectRows, ownerRows, termsRows] = await Promise.all([
        fetchProjects(),
        fetchAllOwnersLite(),
        fetchAllOfferTermsLite(),
      ]);
      setProjects(projectRows);
      const byProject: Record<string, ProjectStats> = {};
      for (const o of ownerRows) {
        const s = byProject[o.project_id] ?? { ownerCount: 0, totalNma: 0, leasedNma: 0, leasedCount: 0 };
        s.ownerCount += 1;
        s.totalNma += o.nma;
        if (o.status === 'leased') {
          s.leasedNma += o.nma;
          s.leasedCount += 1;
        }
        byProject[o.project_id] = s;
      }
      setStats(byProject);

      // First (lowest sort_order) terms set per project previews on the
      // card; any additional sets just show as a "+N more" count.
      const byProjectTerms: Record<string, TermsPreview> = {};
      for (const t of termsRows) {
        const existing = byProjectTerms[t.project_id];
        if (!existing) {
          byProjectTerms[t.project_id] = {
            label: t.label,
            rate_per_acre: t.rate_per_acre,
            royalty_label: t.royalty_label,
            lease_term_months: t.lease_term_months,
            extraCount: 0,
          };
        } else {
          existing.extraCount += 1;
        }
      }
      setTermsPreview(byProjectTerms);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load projects.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const activeProjects = useMemo(() => projects.filter((p) => !p.is_archived), [projects]);

  async function handleCreate(input: ProjectInput, initialTerms?: OfferTermsInput) {
    const project = await createProject(input);
    if (initialTerms) await createOfferTerms(project.id, initialTerms);
    setShowForm(false);
    await load();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Leasing Projects</h1>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          + New Project
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading && <p className="text-sm text-stone-400">Loading…</p>}

      {!loading && activeProjects.length === 0 && (
        <div className="rounded-xl border border-dashed border-stone-300 p-10 text-center dark:border-stone-700">
          <p className="text-stone-500 dark:text-stone-400">
            No leasing projects yet. Create one to start tracking mineral owners.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {activeProjects.map((p) => {
          const s = stats[p.id] ?? { ownerCount: 0, totalNma: 0, leasedNma: 0, leasedCount: 0 };
          const terms = termsPreview[p.id];
          return (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="rounded-xl border border-stone-200 bg-white p-5 transition hover:border-amber-400 hover:shadow-sm dark:border-stone-800 dark:bg-stone-900 dark:hover:border-amber-600"
            >
              <div className="mb-1 flex items-start justify-between">
                <h2 className="font-semibold text-stone-900 dark:text-stone-100">{p.name}</h2>
                {p.prospect_number && (
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                    #{p.prospect_number}
                  </span>
                )}
              </div>
              {legalDescription(p) && (
                <p className="mb-3 text-sm text-stone-500 dark:text-stone-400">{legalDescription(p)}</p>
              )}

              {terms ? (
                <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-600 dark:text-stone-300">
                  {terms.label && <span className="font-medium text-stone-500 dark:text-stone-400">{terms.label}:</span>}
                  {terms.rate_per_acre != null && <span>{formatMoney(terms.rate_per_acre)}/acre</span>}
                  {terms.royalty_label && <span>{terms.royalty_label} royalty</span>}
                  {terms.lease_term_months != null && <span>{formatLeaseTerm(terms.lease_term_months)}</span>}
                  {terms.extraCount > 0 && (
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                      +{terms.extraCount} more
                    </span>
                  )}
                </div>
              ) : (
                <p className="mb-3 text-sm text-stone-400">No offer terms yet</p>
              )}

              <div className="grid grid-cols-3 gap-2 border-t border-stone-100 pt-3 text-center dark:border-stone-800">
                <div>
                  <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">{s.ownerCount}</div>
                  <div className="text-xs text-stone-400">Owners</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">{formatAcres(s.totalNma)}</div>
                  <div className="text-xs text-stone-400">Total NMA</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatAcres(s.leasedNma)}
                  </div>
                  <div className="text-xs text-stone-400">Leased NMA</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {showForm && <ProjectFormModal onClose={() => setShowForm(false)} onSubmit={handleCreate} />}
    </div>
  );
}
