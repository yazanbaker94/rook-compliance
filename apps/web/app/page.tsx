'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

type View = 'overview' | 'facilities' | 'obligations' | 'documents' | 'field';
type ObligationTab = 'details' | 'evidence' | 'audit';
type Risk = 'LOW' | 'MEDIUM' | 'HIGH';
type ObligationStatus = 'OPEN' | 'IN_PROGRESS' | 'AWAITING_REVIEW' | 'COMPLETE';
type ReviewStatus = 'PROPOSED' | 'ACCEPTED' | 'REJECTED';
type SubmissionReviewStatus = 'PENDING' | 'APPROVED' | 'CORRECTION_REQUESTED';
type Facility = { id: string; name: string; client: string; location: string; readiness: number; risk: Risk };
type Obligation = { id: string; facilityId: string; facility: Facility; title: string; dueDate: string; frequency: string; status: ObligationStatus; risk: Risk; assignedTo: string; evidenceRequired: string };
type Proposal = { id: string; documentId: string; title: string; requirement: string; frequency: string; sourcePage: number; sourceText: string; confidence: number; status: ReviewStatus };
type Submission = { id: string; obligationId: string; obligation: Obligation; inspector: string; completedAt: string; notes: string; reading: string; photoCount: number; syncState: string; reviewStatus: SubmissionReviewStatus; reviewNote: string; reviewedAt: string | null };
type DocumentRecord = { id: string; facilityId: string; name: string; createdAt: string };
type AuditEvent = { id: string; actorId: string; action: string; entityType: string; entityId: string; detail: string; createdAt: string };
type Dashboard = { openObligations: number; attentionRequired: number; averageReadiness: number; pendingReviews: number; fieldSubmissions: number };
type WorkspaceData = { dashboard: Dashboard; facilities: Facility[]; obligations: Obligation[]; proposals: Proposal[]; submissions: Submission[]; documents: DocumentRecord[]; auditEvents: AuditEvent[] };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const DOCUMENT_AI_URL = process.env.NEXT_PUBLIC_DOCUMENT_AI_URL ?? `${API_URL}/document-ai`;
const ASSET_PREFIX = process.env.NODE_ENV === 'production' ? '/corvus' : '';
const evidencePhotos = [
  { src: `${ASSET_PREFIX}/evidence/mw03-context.webp`, title: 'Site context', alt: 'Monitoring well MW-03 with a field worker at the synthetic Red Willow Terminal.' },
  { src: `${ASSET_PREFIX}/evidence/mw03-label.webp`, title: 'Well identification', alt: 'Close-up of the weathered MW-03 identification label.' },
  { src: `${ASSET_PREFIX}/evidence/mw03-site.webp`, title: 'Surrounding conditions', alt: 'Monitoring well MW-03 and its surrounding industrial site conditions.' },
];
const views: View[] = ['overview', 'facilities', 'obligations', 'documents', 'field'];
const viewLabels: Record<View, string> = { overview: 'Overview', facilities: 'Facilities', obligations: 'Obligations', documents: 'Approvals & permits', field: 'Field evidence' };
const viewMeta: Record<View, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: 'Compliance operations', title: 'Good morning, Yazan.', description: 'Here is what needs your attention today.' },
  facilities: { eyebrow: 'Portfolio health', title: 'Facilities', description: 'Explainable readiness across the demonstration portfolio.' },
  obligations: { eyebrow: 'Commitment register', title: 'Obligations', description: 'Track every requirement back to its source and evidence.' },
  documents: { eyebrow: 'Human-reviewed extraction', title: 'Approval review', description: 'Review AI proposals with page citations before they become work.' },
  field: { eyebrow: 'Field evidence', title: 'Submission review', description: 'Validate synced readings, photos, location, and field notes.' },
};

const WORKSPACE_QUERY = `query Workspace {
  dashboard { openObligations attentionRequired averageReadiness pendingReviews fieldSubmissions }
  facilities { id name client location readiness risk }
  obligations { id facilityId title dueDate frequency status risk assignedTo evidenceRequired facility { id name client location readiness risk } }
  proposals { id documentId title requirement frequency sourcePage sourceText confidence status }
  submissions { id obligationId inspector completedAt notes reading photoCount syncState reviewStatus reviewNote reviewedAt obligation { id facilityId title dueDate frequency status risk assignedTo evidenceRequired facility { id name client location readiness risk } } }
  documents { id facilityId name createdAt }
  auditEvents { id actorId action entityType entityId detail createdAt }
}`;

async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_URL}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const payload = await response.json() as { data?: T; errors?: { message: string }[] };
  if (!response.ok || payload.errors?.length || !payload.data) throw new Error(payload.errors?.[0]?.message ?? `Request failed (${response.status})`);
  return payload.data;
}

function currentView(): View {
  if (typeof window === 'undefined') return 'overview';
  const candidate = window.location.hash.replace('#', '') as View;
  return views.includes(candidate) ? candidate : 'overview';
}

export default function Home() {
  const [view, setView] = useState<View>('overview');
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [connection, setConnection] = useState<'loading' | 'connected' | 'error'>('loading');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [importRequest, setImportRequest] = useState(0);

  const refresh = useCallback(async () => {
    setConnection('loading');
    try {
      const next = await graphql<WorkspaceData>(WORKSPACE_QUERY);
      setData(next); setConnection('connected'); setError('');
    } catch (requestError) {
      setConnection('error'); setError(requestError instanceof Error ? requestError.message : 'The workspace could not be loaded.');
    }
  }, []);

  useEffect(() => {
    const onHash = () => setView(currentView());
    const timer = window.setTimeout(() => { onHash(); void refresh(); }, 0);
    window.addEventListener('hashchange', onHash);
    return () => { window.clearTimeout(timer); window.removeEventListener('hashchange', onHash); };
  }, [refresh]);

  function navigate(next: View) { if (window.location.hash === `#${next}`) setView(next); else window.location.hash = next; }
  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(''), 3200); }
  function requestImport() { navigate('documents'); setImportRequest(value => value + 1); }

  return <main className="app-shell">
    <aside className="sidebar">
      <button type="button" className="brand" onClick={() => navigate('overview')}><span className="brand-mark">R</span><span>Rook</span></button>
      <nav aria-label="Primary navigation">{views.map((item, index) => <button type="button" aria-current={view === item ? 'page' : undefined} className={`nav-item ${view === item ? 'active' : ''}`} onClick={() => navigate(item)} key={item}><span>0{index + 1}</span>{viewLabels[item]}</button>)}</nav>
      <div className="sidebar-footer"><div className="user-card"><span className="avatar small">YB</span><div><strong>Yazan Baker</strong><small>Consultant</small></div></div><div className="sidebar-note"><span>Demo workspace</span><strong>Public & synthetic data only</strong></div></div>
    </aside>
    <section className="workspace">
      <header className="topbar"><div><p className="eyebrow">{viewMeta[view].eyebrow}</p><h1>{viewMeta[view].title}</h1><p className="page-description">{viewMeta[view].description}</p></div><div className="top-actions"><span className={`connection ${connection}`}><i />{connection === 'connected' ? 'API connected' : connection === 'loading' ? 'Syncing' : 'API unavailable'}</span><button type="button" className="secondary-button" onClick={requestImport}>Import approval</button><button type="button" className="primary-button" onClick={() => setCreateOpen(true)}>+ Create obligation</button><span className="avatar" aria-label="Yazan Baker">YB</span></div></header>
      {error && <section className="error-state" role="alert"><strong>Workspace unavailable</strong><span>{error}</span><button type="button" onClick={() => void refresh()}>Try again</button></section>}
      {!data && !error && <LoadingState />}
      {data && view === 'overview' && <Overview data={data} navigate={navigate} />}
      {data && view === 'facilities' && <FacilitiesView data={data} navigate={navigate} />}
      {data && view === 'obligations' && <ObligationsView data={data} refresh={refresh} notify={notify} navigate={navigate} />}
      {data && view === 'documents' && <DocumentsView data={data} refresh={refresh} notify={notify} importRequest={importRequest} />}
      {data && view === 'field' && <FieldView data={data} refresh={refresh} notify={notify} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </section>
    {createOpen && data && <CreateObligationModal facilities={data.facilities} onClose={() => setCreateOpen(false)} onCreated={async () => { await refresh(); setCreateOpen(false); navigate('obligations'); notify('Obligation created and added to the live register.'); }} />}
  </main>;
}

function LoadingState() { return <div className="loading-grid" aria-label="Loading workspace"><span /><span /><span /><span /></div>; }

function Overview({ data, navigate }: { data: WorkspaceData; navigate: (view: View) => void }) {
  const pendingEvidence = data.submissions.filter(item => item.reviewStatus === 'PENDING').length;
  const attention = data.obligations.filter(item => item.status !== 'COMPLETE').sort((a, b) => riskRank(b.risk) - riskRank(a.risk) || a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
  return <><section className="attention-grid" aria-label="Compliance summary">
    <button type="button" className="attention-card danger" onClick={() => navigate('obligations')}><span className="metric-icon">!</span><div><small>Attention required</small><strong>{data.dashboard.attentionRequired}</strong><p>High-risk open obligations</p></div><b>View register →</b></button>
    <button type="button" className="attention-card amber" onClick={() => navigate('obligations')}><span className="metric-icon">◷</span><div><small>Open obligations</small><strong>{data.dashboard.openObligations}</strong><p>Across {data.facilities.length} facilities</p></div><b>Review work →</b></button>
    <button type="button" className="attention-card gold" onClick={() => navigate('field')}><span className="metric-icon">▣</span><div><small>Evidence awaiting review</small><strong>{pendingEvidence}</strong><p>{data.dashboard.fieldSubmissions} synced submission{data.dashboard.fieldSubmissions === 1 ? '' : 's'}</p></div><b>Review now →</b></button>
    <button type="button" className="attention-card green" onClick={() => navigate('documents')}><span className="metric-icon">✦</span><div><small>AI proposals awaiting review</small><strong>{data.dashboard.pendingReviews}</strong><p>Human decision required</p></div><b>Review proposals →</b></button>
  </section><div className="overview-grid">
    <section className="panel attention-panel"><PanelHeading title="Needs attention" action="View all obligations" onAction={() => navigate('obligations')} /><div className="attention-list">{attention.map(item => <ObligationLine item={item} key={item.id} />)}</div></section>
    <section className="panel readiness-panel"><PanelHeading title="Facility readiness" action="View all facilities" onAction={() => navigate('facilities')} /><div className="readiness-table">{data.facilities.map(facility => <div className="readiness-row" key={facility.id}><div><strong>{facility.name}</strong><small>{facility.location}</small></div><div className="progress"><span style={{ width: `${facility.readiness}%` }} /></div><strong>{facility.readiness}%</strong><span className={`risk-pill ${facility.risk.toLowerCase()}`}>{facility.risk === 'HIGH' ? 'Attention' : 'On track'}</span></div>)}</div></section>
    <section className="panel review-queue"><PanelHeading title="Review queue" /><div className="queue-grid"><button type="button" onClick={() => navigate('field')}><strong>{pendingEvidence}</strong><span>Field submissions</span><small>Awaiting decision</small></button><button type="button" onClick={() => navigate('documents')}><strong>{data.dashboard.pendingReviews}</strong><span>Approval proposals</span><small>Awaiting decision</small></button><button type="button" onClick={() => navigate('obligations')}><strong>{data.obligations.filter(item => item.status === 'AWAITING_REVIEW').length}</strong><span>Obligations</span><small>Evidence received</small></button></div></section>
  </div></>;
}

function PanelHeading({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) { return <div className="panel-heading"><h2>{title}</h2>{action && <button type="button" className="text-button" onClick={onAction}>{action} →</button>}</div>; }
function ObligationLine({ item }: { item: Obligation }) { return <article className="obligation-line"><span className={`priority-dot ${item.risk.toLowerCase()}`} /><div><strong>{item.title}</strong><small>{item.facility.name} · {item.evidenceRequired}</small></div><time>{formatDue(item.dueDate)}</time><span className={`risk-pill ${item.risk.toLowerCase()}`}>{titleCase(item.risk)}</span></article>; }

function FacilitiesView({ data, navigate }: { data: WorkspaceData; navigate: (view: View) => void }) {
  return <section className="panel facilities-page"><PanelHeading title={`${data.facilities.length} operating sites`} action="Open obligation register" onAction={() => navigate('obligations')} /><div className="facility-cards">{data.facilities.map(facility => {
    const facilityObligations = data.obligations.filter(item => item.facilityId === facility.id); const open = facilityObligations.filter(item => item.status !== 'COMPLETE').length; const high = facilityObligations.filter(item => item.risk === 'HIGH' && item.status !== 'COMPLETE').length;
    const health = high ? 'high' : facility.readiness < 85 ? 'medium' : 'low'; const healthLabel = high ? 'Needs attention' : facility.readiness < 85 ? 'Watch' : 'On track'; const explanation = high ? `${high} high-risk requirement${high === 1 ? '' : 's'} need action.` : open ? `${open} active requirement${open === 1 ? '' : 's'} remain; none are high risk.` : 'No active obligations are waiting on this facility.';
    return <article className="facility-card" key={facility.id}><div className="facility-card-top"><span className="facility-icon">{initials(facility.name)}</span><span className={`risk-pill ${health}`}>{healthLabel}</span></div><h2>{facility.name}</h2><p>{facility.client} · {facility.location}</p><div className="facility-score"><strong>{facility.readiness}%</strong><div className="progress"><span style={{ width: `${facility.readiness}%` }} /></div></div><dl><div><dt>Open obligations</dt><dd>{open}</dd></div><div><dt>High risk</dt><dd>{high}</dd></div></dl><div className="insight"><strong>Why this score</strong><span>{explanation}</span></div></article>;
  })}</div></section>;
}

function ObligationsView({ data, refresh, notify, navigate }: { data: WorkspaceData; refresh: () => Promise<void>; notify: (message: string) => void; navigate: (view: View) => void }) {
  const [query, setQuery] = useState('');
  const [facilityFilter, setFacilityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState(data.obligations[0]?.id ?? '');
  const [drawerTab, setDrawerTab] = useState<ObligationTab>('details');
  const [saving, setSaving] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<number | null>(null);
  const filtered = data.obligations.filter(item => (facilityFilter === 'ALL' || item.facilityId === facilityFilter) && (statusFilter === 'ALL' || item.status === statusFilter) && `${item.title} ${item.facility.name} ${item.assignedTo}`.toLowerCase().includes(query.toLowerCase()));
  const selected = filtered.find(item => item.id === selectedId) ?? filtered[0];
  const sourceProposal = selected ? data.proposals.find(item => `obl-${item.id}` === selected.id) : undefined;
  const relatedSubmissions = selected ? data.submissions.filter(item => item.obligationId === selected.id) : [];
  const relatedSubmissionIds = new Set(relatedSubmissions.map(item => item.id));
  const relatedAudit = selected ? data.auditEvents.filter(event =>
    (event.entityType === 'Obligation' && event.entityId === selected.id) ||
    (sourceProposal && event.entityType === 'Proposal' && event.entityId === sourceProposal.id) ||
    (event.entityType === 'FieldSubmission' && relatedSubmissionIds.has(event.entityId))
  ) : [];

  function selectObligation(id: string) { setSelectedId(id); setDrawerTab('details'); }
  async function setStatus(status: ObligationStatus) {
    if (!selected) return;
    setSaving(true);
    try {
      await graphql(`mutation UpdateStatus($id: ID!, $status: ObligationStatus!) { updateObligationStatus(id: $id, status: $status) { id status } }`, { id: selected.id, status });
      await refresh();
      notify(`Obligation moved to ${titleCase(status)}.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Status could not be updated.');
    } finally {
      setSaving(false);
    }
  }

  return <div className="register-layout"><section className="panel register-panel"><div className="register-tabs"><strong>Obligation register</strong><span>Live API data</span></div><div className="filter-bar"><label>Facility<select aria-label="Filter by facility" value={facilityFilter} onChange={event => setFacilityFilter(event.target.value)}><option value="ALL">All facilities</option>{data.facilities.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Status<select aria-label="Filter by status" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="ALL">All statuses</option>{(['OPEN', 'IN_PROGRESS', 'AWAITING_REVIEW', 'COMPLETE'] as ObligationStatus[]).map(item => <option value={item} key={item}>{titleCase(item)}</option>)}</select></label><label className="search-field">Search<input aria-label="Search obligations" placeholder="Title, facility, or owner" value={query} onChange={event => setQuery(event.target.value)} /></label></div><div className="record-count">{filtered.length} of {data.obligations.length} obligations</div><div className="register-table" role="table" aria-label="Obligation register"><div className="register-head" role="row"><span>Obligation</span><span>Facility</span><span>Next due</span><span>Status</span><span>Risk</span><span>Owner</span></div>{filtered.map(item => <button type="button" role="row" aria-selected={selected?.id === item.id} className={`register-row ${selected?.id === item.id ? 'selected' : ''}`} key={item.id} onClick={() => selectObligation(item.id)}><span><strong>{item.title}</strong><small>{item.frequency} · {item.evidenceRequired}</small></span><span>{item.facility.name}</span><span><strong>{formatDate(item.dueDate)}</strong><small>{formatDue(item.dueDate)}</small></span><span><StatusPill status={item.status} /></span><span><span className={`risk-pill ${item.risk.toLowerCase()}`}>{titleCase(item.risk)}</span></span><span>{item.assignedTo}</span></button>)}</div>{!filtered.length && <div className="empty-state">No obligations match these filters.</div>}</section>
    <aside className="detail-drawer">{selected ? <><div className="drawer-heading"><span className={`priority-dot ${selected.risk.toLowerCase()}`} /><div><small>{titleCase(selected.status)}</small><h2>{selected.title}</h2><p>{selected.frequency} · {selected.facility.name}</p></div></div><div className="detail-tabs" role="tablist" aria-label="Obligation information">{(['details', 'evidence', 'audit'] as ObligationTab[]).map(tab => <button type="button" role="tab" aria-selected={drawerTab === tab} className={drawerTab === tab ? 'active' : ''} onClick={() => setDrawerTab(tab)} key={tab}>{titleCase(tab)}</button>)}</div>
      {drawerTab === 'details' && <dl className="detail-list" role="tabpanel"><div><dt>Facility</dt><dd>{selected.facility.name}<small>{selected.facility.location}</small></dd></div><div><dt>Next due</dt><dd>{formatDate(selected.dueDate)}<small>{formatDue(selected.dueDate)}</small></dd></div><div><dt>Owner</dt><dd>{selected.assignedTo}</dd></div><div><dt>Risk</dt><dd><span className={`risk-pill ${selected.risk.toLowerCase()}`}>{titleCase(selected.risk)}</span></dd></div><div><dt>Evidence required</dt><dd>{selected.evidenceRequired}</dd></div>{sourceProposal && <div><dt>Source citation</dt><dd><strong>Page {sourceProposal.sourcePage}</strong><small>“{sourceProposal.sourceText}”</small></dd></div>}</dl>}
      {drawerTab === 'evidence' && <section className="drawer-panel" role="tabpanel">{relatedSubmissions.length ? relatedSubmissions.map(submission => <article className="drawer-submission" key={submission.id}><div className="drawer-submission-heading"><div><strong>{submission.inspector}</strong><small>{formatDateTime(submission.completedAt)}</small></div><StatusPill status={submission.reviewStatus} /></div><dl><div><dt>Reading</dt><dd>{submission.reading}</dd></div><div><dt>Photos</dt><dd>{submission.photoCount} geotagged</dd></div><div><dt>Field note</dt><dd>{submission.notes.split(' · ')[0]}</dd></div></dl>{submission.id === 'sub-groundwater-01' && <EvidencePhotoStrip count={submission.photoCount} onOpen={setPreviewPhoto} />}<button type="button" className="secondary-button drawer-wide-button" onClick={() => navigate('field')}>Open full field review</button></article>) : <div className="drawer-empty"><strong>No evidence synced yet</strong><p>Field submissions, readings, and photos will appear here after the mobile app syncs.</p></div>}</section>}
      {drawerTab === 'audit' && <section className="drawer-panel drawer-audit" role="tabpanel">{relatedAudit.length ? relatedAudit.map(event => <article key={event.id}><span className="audit-marker">✓</span><div><strong>{titleCase(event.action)}</strong><small>{formatDateTime(event.createdAt)} · {event.actorId}</small><p>{formatAuditDetail(event.detail)}</p></div></article>) : <div className="drawer-empty"><strong>No recorded workflow events</strong><p>Status changes, document decisions, and evidence reviews will appear here.</p></div>}</section>}
      <div className="drawer-actions">{selected.status === 'AWAITING_REVIEW' ? <button type="button" className="primary-button" onClick={() => navigate('field')}>Review evidence</button> : <><button type="button" className="secondary-button" disabled={saving || selected.status !== 'OPEN'} onClick={() => void setStatus('IN_PROGRESS')}>Start work</button><button type="button" className="primary-button" disabled={saving || selected.status !== 'IN_PROGRESS'} onClick={() => void setStatus('COMPLETE')}>{saving ? 'Saving…' : selected.status === 'COMPLETE' ? 'Completed' : 'Mark complete'}</button></>}</div></> : <div className="empty-state">Select an obligation.</div>}</aside>
    {previewPhoto !== null && <PhotoLightbox index={previewPhoto} onClose={() => setPreviewPhoto(null)} />}
  </div>;
}

function DocumentsView({ data, refresh, notify, importRequest }: { data: WorkspaceData; refresh: () => Promise<void>; notify: (message: string) => void; importRequest: number }) {
  const fileRef = useRef<HTMLInputElement>(null); const [facilityId, setFacilityId] = useState(data.facilities[0]?.id ?? ''); const [selectedId, setSelectedId] = useState(data.proposals.find(item => item.status === 'PROPOSED')?.id ?? data.proposals[0]?.id ?? ''); const [busy, setBusy] = useState(''); const [editing, setEditing] = useState(false); const [draft, setDraft] = useState({ title: '', frequency: '', requirement: '' });
  const selected = data.proposals.find(item => item.id === selectedId) ?? data.proposals[0]; const document = data.documents.find(item => item.id === selected?.documentId) ?? data.documents[0]; const documentProposals = data.proposals.filter(item => item.documentId === selected?.documentId); const position = Math.max(documentProposals.findIndex(item => item.id === selected?.id), 0); const remaining = documentProposals.filter(item => item.status === 'PROPOSED').length;
  useEffect(() => { if (importRequest > 0) window.setTimeout(() => fileRef.current?.click(), 50); }, [importRequest]);
  function startEditing() { if (!selected) return; setDraft({ title: selected.title, frequency: selected.frequency, requirement: selected.requirement }); setEditing(true); }
  async function importPdf(file?: File) { if (!file) return; setBusy('Importing approval…'); try { const form = new FormData(); form.append('file', file); const extractionResponse = await fetch(`${DOCUMENT_AI_URL}/extract-file`, { method: 'POST', body: form }); const extraction = await extractionResponse.json() as { document_name?: string; proposals?: { title: string; requirement: string; frequency: string; source_page: number; source_text: string; confidence: number }[]; detail?: string }; if (!extractionResponse.ok) throw new Error(extraction.detail ?? 'The PDF could not be extracted.'); if (!extraction.proposals?.length) throw new Error('No enforceable clauses were found. Try the synthetic approval PDF.'); const imported = await graphql<{ importDocument: DocumentRecord }>(`mutation Import($facilityId: ID!, $name: String!, $proposals: [ImportedProposalInput!]!) { importDocument(facilityId: $facilityId, name: $name, proposals: $proposals) { id name facilityId createdAt } }`, { facilityId, name: extraction.document_name ?? file.name, proposals: extraction.proposals.map(item => ({ title: item.title, requirement: item.requirement, frequency: item.frequency, sourcePage: item.source_page, sourceText: item.source_text, confidence: item.confidence })) }); const next = await graphql<WorkspaceData>(WORKSPACE_QUERY); const first = next.proposals.find(item => item.documentId === imported.importDocument.id); await refresh(); if (first) setSelectedId(first.id); notify(`${extraction.proposals.length} proposal${extraction.proposals.length === 1 ? '' : 's'} extracted and saved for review.`); } catch (error) { notify(error instanceof Error ? error.message : 'The approval could not be imported.'); } finally { setBusy(''); if (fileRef.current) fileRef.current.value = ''; } }
  async function saveEdit() { if (!selected) return; setBusy('Saving proposal…'); try { await graphql(`mutation Edit($id: ID!, $input: UpdateProposalInput!) { updateProposal(id: $id, input: $input) { id title requirement frequency } }`, { id: selected.id, input: draft }); await refresh(); setEditing(false); notify('Proposal edits saved to the audit trail.'); } catch (error) { notify(error instanceof Error ? error.message : 'The proposal could not be saved.'); } finally { setBusy(''); } }
  async function decide(status: 'ACCEPTED' | 'REJECTED') { if (!selected) return; setBusy(status === 'ACCEPTED' ? 'Accepting proposal…' : 'Rejecting proposal…'); try { const operation = status === 'ACCEPTED' ? 'acceptProposal' : 'rejectProposal'; await graphql(`mutation Decide($id: ID!) { ${operation}(id: $id) { id status } }`, { id: selected.id }); await refresh(); notify(status === 'ACCEPTED' ? 'Proposal accepted into the obligation register.' : 'Proposal rejected and recorded in the audit trail.'); } catch (error) { notify(error instanceof Error ? error.message : 'The decision could not be saved.'); } finally { setBusy(''); } }
  function move(offset: number) { if (!documentProposals.length) return; const next = documentProposals[(position + offset + documentProposals.length) % documentProposals.length]; setSelectedId(next.id); setEditing(false); }
  return <><div className="document-toolbar"><div className="document-selector"><label>Import for<select aria-label="Facility for imported approval" value={facilityId} onChange={event => setFacilityId(event.target.value)}>{data.facilities.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><input ref={fileRef} hidden tabIndex={-1} type="file" accept="application/pdf,.pdf" onChange={event => void importPdf(event.target.files?.[0])} /><button type="button" className="secondary-button" onClick={() => fileRef.current?.click()} disabled={Boolean(busy)}>{busy === 'Importing approval…' ? busy : 'Upload approval PDF'}</button></div><div className="proposal-progress"><strong>{remaining} proposal{remaining === 1 ? '' : 's'} {remaining === 1 ? 'needs' : 'need'} a decision</strong><span><button type="button" aria-label="Previous proposal" onClick={() => move(-1)}>‹</button>Proposal {documentProposals.length ? position + 1 : 0} of {documentProposals.length}<button type="button" aria-label="Next proposal" onClick={() => move(1)}>›</button></span></div></div>
    {selected ? <div className="approval-layout"><section className="pdf-viewer"><div className="pdf-toolbar"><strong>{document?.name ?? 'Approval.pdf'}</strong><span>Page {selected.sourcePage}</span><span>100%</span></div><div className="pdf-canvas"><article className="pdf-sheet"><small>DEMONSTRATION APPROVAL · PAGE {selected.sourcePage}</small><h2>Operating conditions</h2><p>Approval holders remain responsible for interpreting all applicable requirements and conditions.</p><h3>{selected.sourcePage}.1 Requirement</h3><p className="highlight">{selected.sourceText}</p><p>Records supporting completion must be retained and made available for review.</p><footer>Public and synthetic demonstration document</footer></article></div><div className="source-strip"><strong>Source text</strong><blockquote>“{selected.sourceText}”</blockquote><span>{document?.name} · Page {selected.sourcePage}</span></div></section>
      <section className="proposal-editor"><div className="proposal-editor-heading"><div><small>AI proposal</small><h2>{selected.title}</h2></div><span className="confidence">{Math.round(selected.confidence * 100)}% confidence</span></div><StatusPill status={selected.status} />{editing ? <div className="edit-form"><label>Required action<input value={draft.title} onChange={event => setDraft(value => ({ ...value, title: event.target.value }))} /></label><label>Frequency<input value={draft.frequency} onChange={event => setDraft(value => ({ ...value, frequency: event.target.value }))} /></label><label>Evidence required<textarea rows={5} value={draft.requirement} onChange={event => setDraft(value => ({ ...value, requirement: event.target.value }))} /></label><div className="edit-actions"><button type="button" className="secondary-button" onClick={() => setEditing(false)}>Cancel</button><button type="button" className="primary-button" disabled={Boolean(busy)} onClick={() => void saveEdit()}>{busy || 'Save changes'}</button></div></div> : <dl className="proposal-fields"><div><dt>Required action</dt><dd>{selected.title}</dd></div><div><dt>Frequency</dt><dd>{selected.frequency}</dd></div><div><dt>Evidence required</dt><dd>{selected.requirement}</dd></div><div><dt>Applicability</dt><dd>{data.facilities.find(item => item.id === document?.facilityId)?.name ?? 'Selected facility'}</dd></div><div><dt>Source</dt><dd>Page {selected.sourcePage}</dd></div></dl>}{!editing && <div className="decision-actions"><button type="button" className="reject-button" disabled={Boolean(busy) || selected.status !== 'PROPOSED'} onClick={() => void decide('REJECTED')}>{selected.status === 'REJECTED' ? 'Rejected' : 'Reject'}</button><button type="button" className="secondary-button" disabled={selected.status !== 'PROPOSED'} onClick={startEditing}>Edit</button><button type="button" className="primary-button" disabled={Boolean(busy) || selected.status !== 'PROPOSED'} onClick={() => void decide('ACCEPTED')}>{busy || (selected.status === 'ACCEPTED' ? 'Accepted' : 'Accept proposal')}</button></div>}<div className="review-principle"><strong>Traceable. Defensible. Auditable.</strong><p>Every proposal remains linked to its exact source. Human decisions create the official obligation.</p></div></section></div> : <section className="empty-state large"><h2>No proposals yet</h2><p>Upload a synthetic approval PDF to extract reviewable clauses.</p><button type="button" className="primary-button" onClick={() => fileRef.current?.click()}>Upload approval PDF</button></section>}</>;
}

function FieldView({ data, refresh, notify }: { data: WorkspaceData; refresh: () => Promise<void>; notify: (message: string) => void }) {
  const [selectedId, setSelectedId] = useState(data.submissions[0]?.id ?? ''); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false); const [previewPhoto, setPreviewPhoto] = useState<number | null>(null); const selected = data.submissions.find(item => item.id === selectedId) ?? data.submissions[0]; const events = selected ? data.auditEvents.filter(item => item.entityType === 'FieldSubmission' && item.entityId === selected.id) : []; const gps = selected?.notes.match(/GPS:\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/); const fieldNote = selected?.notes.split(' · ')[0] ?? '';
  async function review(status: 'APPROVED' | 'CORRECTION_REQUESTED') { if (!selected) return; if (status === 'CORRECTION_REQUESTED' && !note.trim()) return notify('Add a correction note before returning the submission.'); setBusy(true); try { await graphql(`mutation Review($id: ID!, $status: SubmissionReviewStatus!, $note: String!) { reviewSubmission(id: $id, status: $status, note: $note) { id reviewStatus reviewNote reviewedAt obligation { id status } } }`, { id: selected.id, status, note: note.trim() }); await refresh(); notify(status === 'APPROVED' ? 'Evidence approved and the obligation was completed.' : 'Correction requested and the obligation returned to field work.'); setNote(''); } catch (error) { notify(error instanceof Error ? error.message : 'The review could not be saved.'); } finally { setBusy(false); } }
  if (!selected) return <section className="empty-state large"><h2>No field submissions</h2><p>Sync an inspection from Rook Field and it will appear here.</p></section>;
  return <div className="field-review-layout"><aside className="submission-list"><h2>Submissions</h2>{data.submissions.map(item => <button type="button" className={item.id === selected.id ? 'active' : ''} key={item.id} onClick={() => setSelectedId(item.id)}><span className={`review-dot ${item.reviewStatus.toLowerCase()}`} /><div><strong>{item.obligation.title}</strong><small>{item.inspector} · {formatDateTime(item.completedAt)}</small></div><StatusPill status={item.reviewStatus} /></button>)}</aside>
    <section className="submission-summary panel"><div className="section-number"><span>1</span><h2>Submission summary</h2></div><dl className="summary-details"><div><dt>Obligation</dt><dd>{selected.obligation.title}</dd></div><div><dt>Facility</dt><dd>{selected.obligation.facility.name}<small>{selected.obligation.facility.location}</small></dd></div><div><dt>Field worker</dt><dd>{selected.inspector}</dd></div><div><dt>Captured</dt><dd>{formatDateTime(selected.completedAt)}</dd></div><div><dt>Sync status</dt><dd><span className="synced-mark">✓ Synced</span></dd></div></dl><div className="sync-timeline"><strong>Sync timeline</strong><div><span className="done">✓<small>Saved offline</small></span><i /><span className="done">✓<small>Queued</small></span><i /><span className="done">✓<small>Uploaded</small></span><i /><span className="done">✓<small>Synced</small></span></div></div></section>
    <section className="evidence-content panel"><div className="section-number"><span>2</span><h2>Evidence content</h2></div><div className="map-reading"><div className="mini-map"><i /><span>{gps ? `${gps[1]}° N, ${Math.abs(Number(gps[2])).toFixed(5)}° W` : 'GPS not captured'}</span></div><div className="reading"><small>Recorded result</small><strong>{selected.reading}</strong></div></div><div className="photo-heading"><strong>Photos</strong><span>{selected.photoCount} geotagged</span></div>{selected.photoCount ? <EvidencePhotoStrip count={selected.photoCount} onOpen={setPreviewPhoto} /> : <div className="drawer-empty"><strong>No photos attached</strong><p>The mobile submission did not include image evidence.</p></div>}<div className="field-note"><small>Field note</small><p>{fieldNote}</p></div></section>
    <aside className="review-actions-panel panel"><div className="section-number"><span>3</span><h2>Review & actions</h2></div><StatusPill status={selected.reviewStatus} /><label>Reviewer note<textarea aria-label="Reviewer note" rows={4} placeholder="Required when requesting a correction" value={note} disabled={selected.reviewStatus !== 'PENDING'} onChange={event => setNote(event.target.value)} /></label><button type="button" className="approve-button" disabled={busy || selected.reviewStatus !== 'PENDING'} onClick={() => void review('APPROVED')}>{selected.reviewStatus === 'APPROVED' ? '✓ Evidence approved' : '✓ Approve evidence'}</button><button type="button" className="correction-button" disabled={busy || selected.reviewStatus !== 'PENDING'} onClick={() => void review('CORRECTION_REQUESTED')}>{selected.reviewStatus === 'CORRECTION_REQUESTED' ? '△ Correction requested' : '△ Request correction'}</button>{selected.reviewNote && <div className="review-note"><strong>Latest review note</strong><p>{selected.reviewNote}</p></div>}<div className="audit-timeline"><strong>Review history</strong>{events.length ? events.map(event => <article key={event.id}><span className="avatar small">YB</span><div><strong>{event.action.replaceAll('_', ' ')}</strong><small>{formatDateTime(event.createdAt)}</small></div></article>) : <p>No decisions recorded yet.</p>}</div></aside>{previewPhoto !== null && <PhotoLightbox index={previewPhoto} onClose={() => setPreviewPhoto(null)} />}</div>;
}

function EvidencePhotoStrip({ count, onOpen }: { count: number; onOpen: (index: number) => void }) {
  return <div className="photo-grid">{evidencePhotos.slice(0, Math.min(count, evidencePhotos.length)).map((photo, index) => <button type="button" className="evidence-photo" aria-label={`Open ${photo.title.toLowerCase()} photo`} onClick={() => onOpen(index)} key={photo.src}><Image src={photo.src} alt={photo.alt} width={1254} height={1254} unoptimized /><span>{photo.title}<small>View photo</small></span></button>)}</div>;
}

function PhotoLightbox({ index, onClose }: { index: number; onClose: () => void }) {
  const [activeIndex, setActiveIndex] = useState(index);
  const photo = evidencePhotos[activeIndex];
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  function move(offset: number) { setActiveIndex(value => (value + offset + evidencePhotos.length) % evidencePhotos.length); }
  return <div className="photo-lightbox-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) onClose(); }}><section className="photo-lightbox" role="dialog" aria-modal="true" aria-labelledby="photo-lightbox-title"><div className="photo-lightbox-heading"><div><p className="eyebrow">Geotagged field evidence</p><h2 id="photo-lightbox-title">{photo.title}</h2></div><button type="button" aria-label="Close evidence photo" onClick={onClose}>×</button></div><Image src={photo.src} alt={photo.alt} width={1450} height={1100} unoptimized /><div className="photo-lightbox-footer"><button type="button" className="secondary-button" aria-label="Previous evidence photo" onClick={() => move(-1)}>← Previous</button><div><strong>MW-03 groundwater monitoring</strong><small>52.26800° N, 113.81100° W · Aug 24, 2026</small></div><button type="button" className="secondary-button" aria-label="Next evidence photo" onClick={() => move(1)}>Next →</button></div></section></div>;
}

function CreateObligationModal({ facilities, onClose, onCreated }: { facilities: Facility[]; onClose: () => void; onCreated: () => Promise<void> }) {
  const [saving, setSaving] = useState(false); const [form, setForm] = useState({ facilityId: facilities[0]?.id ?? '', title: '', dueDate: isoDateInDays(21), frequency: 'Monthly', risk: 'MEDIUM' as Risk, assignedTo: 'Jordan Lee', evidenceRequired: '' });
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const fields = new FormData(event.currentTarget); const input = { ...form, dueDate: String(fields.get('dueDate') ?? form.dueDate) }; setSaving(true); try { await graphql(`mutation Create($input: CreateObligationInput!) { createObligation(input: $input) { id title status } }`, { input }); await onCreated(); } finally { setSaving(false); } }
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="create-title"><div className="modal-heading"><div><p className="eyebrow">New register item</p><h2 id="create-title">Create obligation</h2></div><button type="button" aria-label="Close create obligation" onClick={onClose}>×</button></div><form onSubmit={event => void submit(event)}><label>Facility<select required value={form.facilityId} onChange={event => setForm(value => ({ ...value, facilityId: event.target.value }))}>{facilities.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label className="span-two">Required action<input required minLength={3} placeholder="e.g. Inspect secondary containment" value={form.title} onChange={event => setForm(value => ({ ...value, title: event.target.value }))} /></label><label>Due date<input required name="dueDate" type="date" defaultValue={form.dueDate} /></label><label>Frequency<select value={form.frequency} onChange={event => setForm(value => ({ ...value, frequency: event.target.value }))}><option>Monthly</option><option>Quarterly</option><option>Annual</option><option>As required</option></select></label><label>Risk<select value={form.risk} onChange={event => setForm(value => ({ ...value, risk: event.target.value as Risk }))}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></label><label>Owner<input required value={form.assignedTo} onChange={event => setForm(value => ({ ...value, assignedTo: event.target.value }))} /></label><label className="span-two">Evidence required<textarea required minLength={3} rows={4} placeholder="Checklist, reading, and geotagged photos" value={form.evidenceRequired} onChange={event => setForm(value => ({ ...value, evidenceRequired: event.target.value }))} /></label><div className="modal-actions span-two"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Creating…' : 'Create obligation'}</button></div></form></section></div>;
}

function StatusPill({ status }: { status: string }) { return <span className={`status-pill ${status.toLowerCase()}`}>{titleCase(status)}</span>; }
function titleCase(value: string) { return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, character => character.toUpperCase()); }
function initials(value: string) { return value.split(' ').slice(0, 2).map(item => item[0]).join(''); }
function riskRank(risk: Risk) { return risk === 'HIGH' ? 3 : risk === 'MEDIUM' ? 2 : 1; }
function formatAuditDetail(value: string) {
  try {
    const detail = JSON.parse(value) as Record<string, unknown>;
    if (typeof detail.note === 'string' && detail.note) return detail.note;
    if (typeof detail.status === 'string') return `Status set to ${titleCase(detail.status)}.`;
    if (typeof detail.title === 'string') return detail.title;
    if (typeof detail.sourcePage === 'number') return `Decision recorded for source page ${detail.sourcePage}.`;
    return 'Workflow event recorded.';
  } catch { return value || 'Workflow event recorded.'; }
}
function formatDate(value: string) { return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)); }
function isoDateInDays(days: number) { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }
function formatDue(value: string) { const today = new Date(); today.setHours(0, 0, 0, 0); const days = Math.round((new Date(`${value}T00:00:00`).getTime() - today.getTime()) / 86400000); return days < 0 ? `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}` : days === 0 ? 'Due today' : `Due in ${days} days`; }
