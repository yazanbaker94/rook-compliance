'use client';

import { useEffect, useMemo, useState } from 'react';
import { DndContext, type DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type View = 'overview' | 'facilities' | 'obligations' | 'documents' | 'field';
type Decision = 'PROPOSED' | 'ACCEPTED' | 'REJECTED';

const facilities = [
  { name: 'North Ridge Gas Plant', client: 'Summit Energy', location: 'Grande Prairie, AB', score: 78, status: 'Attention' },
  { name: 'Clearwater Compressor', client: 'Summit Energy', location: 'Fox Creek, AB', score: 93, status: 'On track' },
  { name: 'Red Willow Terminal', client: 'Prairie Midstream', location: 'Red Deer, AB', score: 96, status: 'On track' },
];

const obligations = [
  { title: 'Monthly wastewater discharge inspection', facility: 'North Ridge Gas Plant', due: 'Due today', owner: 'Jordan Lee', risk: 'High', tone: 'urgent' },
  { title: 'Q3 fugitive emissions review', facility: 'Clearwater Compressor', due: 'Due in 4 days', owner: 'Avery Chen', risk: 'Medium', tone: 'warning' },
  { title: 'Annual GHGRP submission package', facility: 'North Ridge Gas Plant', due: 'Due in 19 days', owner: 'Morgan Reed', risk: 'Medium', tone: 'normal' },
  { title: 'Groundwater monitoring review', facility: 'Red Willow Terminal', due: 'Awaiting review', owner: 'Jordan Lee', risk: 'Low', tone: 'normal' },
];

const proposalSeed = [
  { id: 'prop-01', title: 'Inspect wastewater discharge point', frequency: 'Monthly', page: 14, confidence: 97, citation: 'The approval holder shall inspect the wastewater discharge point at least once during each calendar month.' },
  { id: 'prop-02', title: 'Retain laboratory certificates', frequency: 'For each sample', page: 18, confidence: 94, citation: 'Analytical results and chain-of-custody records must be retained for a minimum of five years.' },
  { id: 'prop-03', title: 'Submit annual monitoring report', frequency: 'Annual', page: 22, confidence: 99, citation: 'An annual monitoring report for the preceding calendar year shall be submitted no later than March 31.' },
];

const viewMeta: Record<View, { eyebrow: string; title: string }> = {
  overview: { eyebrow: 'Compliance operations', title: 'Good morning, Yazan.' },
  facilities: { eyebrow: 'Portfolio health', title: 'Facilities' },
  obligations: { eyebrow: 'Commitment register', title: 'Obligations' },
  documents: { eyebrow: 'Human-reviewed extraction', title: 'Approval review' },
  field: { eyebrow: 'Mobile evidence', title: 'Field submissions' },
};

export default function Home() {
  const [view, setView] = useState<View>('overview');
  const [apiState, setApiState] = useState<'checking' | 'connected' | 'demo'>('checking');
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [toast, setToast] = useState('');
  const acceptedCount = useMemo(() => Object.values(decisions).filter((decision) => decision === 'ACCEPTED').length, [decisions]);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    fetch(`${apiUrl}/health`).then((response) => {
      if (!response.ok) throw new Error('unavailable');
      setApiState('connected');
    }).catch(() => setApiState('demo'));
  }, []);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  }

  async function reviewProposal(id: string, decision: Exclude<Decision, 'PROPOSED'>) {
    setDecisions((current) => ({ ...current, [id]: decision }));
    notify(decision === 'ACCEPTED' ? 'Proposal accepted and added to the register.' : 'Proposal rejected. The decision was added to the audit trail.');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const operation = decision === 'ACCEPTED' ? 'acceptProposal' : 'rejectProposal';
    try {
      const response = await fetch(`${apiUrl}/graphql`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: `mutation { ${operation}(id: "${id}") { id status } }` }),
      });
      if (!response.ok) throw new Error('Review was not persisted');
    } catch {
      notify('Saved in this browser; the API is currently in demo fallback mode.');
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView('overview')}><span className="brand-mark">R</span><span>Rook</span></button>
        <nav aria-label="Primary navigation">
          {(['overview', 'facilities', 'obligations', 'documents', 'field'] as View[]).map((item, index) => (
            <button className={`nav-item ${view === item ? 'active' : ''}`} onClick={() => setView(item)} key={item}>
              <span>0{index + 1}</span>{item === 'field' ? 'Field work' : item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </nav>
        <div className="sidebar-note"><span>Demo workspace</span><strong>Public & synthetic data only</strong></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">{viewMeta[view].eyebrow}</p><h1>{viewMeta[view].title}</h1></div>
          <div className="top-actions">
            <span className={`connection ${apiState}`}><i />{apiState === 'connected' ? 'API connected' : apiState === 'checking' ? 'Checking API' : 'Demo mode'}</span>
            <button className="secondary-button" onClick={() => setView('documents')}>Import approval</button>
            <button className="primary-button" onClick={() => notify('Blank obligation form opened in the production workflow.')}>Create obligation</button>
            <span className="avatar" aria-label="Yazan Baker">YB</span>
          </div>
        </header>

        {view === 'overview' && <Overview onReview={() => setView('documents')} />}
        {view === 'facilities' && <FacilitiesView />}
        {view === 'obligations' && <ObligationsView acceptedCount={acceptedCount} />}
        {view === 'documents' && <DocumentsView decisions={decisions} onReview={reviewProposal} />}
        {view === 'field' && <FieldView onReview={() => notify('Submission approved. Evidence is now linked to the obligation.')} />}
        {toast && <div className="toast" role="status">✓ {toast}</div>}
      </section>
    </main>
  );
}

function Overview({ onReview }: { onReview: () => void }) {
  return <>
    <section className="summary-grid" aria-label="Compliance summary">
      <article className="metric featured"><div><p>Portfolio readiness</p><strong>89%</strong></div><div className="ring"><span>89</span></div><small>Across 3 active facilities</small></article>
      <article className="metric"><p>Open obligations</p><strong>24</strong><small><b>3</b> require attention</small></article>
      <article className="metric"><p>Field submissions</p><strong>11</strong><small><b>2</b> awaiting review</small></article>
      <article className="metric"><p>Evidence coverage</p><strong>94%</strong><small>Up 6% this month</small></article>
    </section>
    <div className="content-grid">
      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">Live portfolio</p><h2>Facility readiness</h2></div><span className="count-badge">3</span></div>
        <FacilityRows compact />
      </section>
      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">Next up</p><h2>Upcoming obligations</h2></div><span className="count-badge">3</span></div>
        <div className="obligation-list">{obligations.slice(0, 3).map((item) => <ObligationRow item={item} key={item.title} />)}</div>
      </section>
    </div>
    <section className="ai-banner">
      <div className="ai-icon">AI</div><div><p className="eyebrow">Human-reviewed automation</p><h2>Turn an approval PDF into traceable obligations</h2><p>Rook proposes requirements with page citations. A consultant accepts, edits, or rejects every result.</p></div>
      <button className="primary-button light" onClick={onReview}>Try document review</button>
    </section>
  </>;
}

function FacilityRows({ compact = false }: { compact?: boolean }) {
  return <div className={`facility-list ${compact ? 'compact' : ''}`}>{facilities.map((facility) => (
    <article className="facility-row" key={facility.name}>
      <div className="facility-icon">{facility.name.split(' ').slice(0, 2).map((word) => word[0]).join('')}</div>
      <div className="facility-name"><strong>{facility.name}</strong><span>{facility.client} · {facility.location}</span></div>
      <div className="progress"><span style={{ width: `${facility.score}%` }} /></div>
      <strong className="score">{facility.score}%</strong><span className={`status ${facility.status === 'Attention' ? 'attention' : ''}`}>{facility.status}</span>
    </article>
  ))}</div>;
}

function FacilitiesView() {
  const chartData = facilities.map((facility) => ({ name: facility.name.split(' ')[0], readiness: facility.score }));
  return <section className="panel full-panel"><div className="panel-heading"><div><p className="eyebrow">Three operating sites</p><h2>Readiness by facility</h2></div><button className="secondary-button">Export summary</button></div><div className="facility-view-grid"><FacilityRows /><div className="readiness-chart" aria-label="Facility readiness chart"><ResponsiveContainer width="100%" height={190}><BarChart data={chartData} margin={{ top: 10, right: 8, left: -25, bottom: 0 }}><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#718078' }} /><YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#829089' }} /><Tooltip cursor={{ fill: '#f1f5f2' }} /><Bar dataKey="readiness" fill="#4d806e" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></div><div className="insight-strip"><strong>Why North Ridge needs attention</strong><span>One overdue inspection and two missing evidence items reduce its score. Every score is explainable—not a black box.</span></div></section>;
}

function ObligationRow({ item, detailed = false }: { item: typeof obligations[number]; detailed?: boolean }) {
  return <article className={`obligation ${detailed ? 'detailed' : ''}`}><span className={`priority-dot ${item.tone}`} /><div><strong>{item.title}</strong><span>{item.facility}{detailed ? ` · Owner: ${item.owner}` : ''}</span></div>{detailed && <span className={`risk risk-${item.risk.toLowerCase()}`}>{item.risk}</span>}<time>{item.due}</time></article>;
}

function ObligationsView({ acceptedCount }: { acceptedCount: number }) {
  const [columns, setColumns] = useState<Record<string, 'upcoming' | 'field' | 'review'>>(() => Object.fromEntries(obligations.map((item, index) => [item.title, index < 2 ? 'upcoming' : index === 2 ? 'field' : 'review'])));
  function dragEnded(event: DragEndEvent) {
    if (!event.over) return;
    setColumns((current) => ({ ...current, [String(event.active.id)]: event.over!.id as 'upcoming' | 'field' | 'review' }));
  }
  return <section className="panel full-panel"><div className="panel-heading"><div><p className="eyebrow">Audit-ready register</p><h2>Drag work as it progresses</h2></div><span className="drag-hint">Drag cards between stages</span></div><DndContext onDragEnd={dragEnded}><div className="work-board"><WorkColumn id="upcoming" title="Upcoming" items={obligations.filter((item) => columns[item.title] === 'upcoming')} /><WorkColumn id="field" title="In field" items={obligations.filter((item) => columns[item.title] === 'field')} /><WorkColumn id="review" title="Review" items={obligations.filter((item) => columns[item.title] === 'review')} acceptedCount={acceptedCount} /></div></DndContext></section>;
}

function WorkColumn({ id, title, items, acceptedCount = 0 }: { id: 'upcoming' | 'field' | 'review'; title: string; items: typeof obligations; acceptedCount?: number }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return <section ref={setNodeRef} className={`work-column ${isOver ? 'over' : ''}`}><div className="work-column-heading"><strong>{title}</strong><span>{items.length + acceptedCount}</span></div>{items.map((item) => <WorkCard item={item} key={item.title} />)}{acceptedCount > 0 && <article className="work-card accepted-new"><span className="frequency">NEW</span><h3>{acceptedCount} reviewed proposal{acceptedCount > 1 ? 's' : ''}</h3><p>Accepted from document review</p></article>}<div className="drop-space">Drop here</div></section>;
}

function WorkCard({ item }: { item: typeof obligations[number] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.title });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 4 } : undefined;
  return <article ref={setNodeRef} style={style} {...listeners} {...attributes} className={`work-card ${isDragging ? 'dragging' : ''}`}><div><span className={`risk risk-${item.risk.toLowerCase()}`}>{item.risk}</span><time>{item.due}</time></div><h3>{item.title}</h3><p>{item.facility} · {item.owner}</p></article>;
}

function DocumentsView({ decisions, onReview }: { decisions: Record<string, Decision>; onReview: (id: string, decision: Exclude<Decision, 'PROPOSED'>) => void }) {
  const remaining = proposalSeed.filter((item) => !decisions[item.id]).length;
  return <div className="documents-layout">
    <aside className="document-card"><div className="pdf-page"><span>APPROVAL</span><strong>Industrial wastewater<br />operating conditions</strong><small>Alberta · Demonstration document</small></div><div><p className="eyebrow">Source file</p><h2>North_Ridge_Approval.pdf</h2><p>28 pages · Processed in 4.2 seconds</p></div><div className="document-safety"><strong>Consultant remains in control</strong><span>Rook never publishes extracted requirements without explicit human review.</span></div></aside>
    <section className="review-panel"><div className="review-heading"><div><p className="eyebrow">Extraction complete</p><h2>{remaining} of {proposalSeed.length} proposals need a decision</h2></div><span className="review-score">95% avg. confidence</span></div>
      <div className="proposal-list">{proposalSeed.map((proposal) => {
        const decision = decisions[proposal.id] ?? 'PROPOSED';
        return <article className={`proposal-card ${decision.toLowerCase()}`} key={proposal.id}><div className="proposal-top"><span className="frequency">{proposal.frequency}</span><span className="confidence">{proposal.confidence}% confidence</span></div><h3>{proposal.title}</h3><blockquote>“{proposal.citation}”</blockquote><p className="citation">Source: page {proposal.page} · click citation to inspect original context</p>{decision === 'PROPOSED' ? <div className="review-actions"><button className="reject-button" onClick={() => onReview(proposal.id, 'REJECTED')}>Reject</button><button className="secondary-button">Edit</button><button className="primary-button" onClick={() => onReview(proposal.id, 'ACCEPTED')}>Accept proposal</button></div> : <div className={`decision ${decision.toLowerCase()}`}>{decision === 'ACCEPTED' ? '✓ Accepted into obligation register' : '× Rejected and recorded in audit trail'}<button onClick={() => onReview(proposal.id, decision === 'ACCEPTED' ? 'REJECTED' : 'ACCEPTED')}>Change decision</button></div>}</article>;
      })}</div>
    </section>
  </div>;
}

function FieldView({ onReview }: { onReview: () => void }) {
  return <div className="field-layout"><section className="panel"><div className="panel-heading"><div><p className="eyebrow">Synced from Rook Field</p><h2>Submission awaiting review</h2></div><span className="status">Synced</span></div><div className="submission"><div className="submission-hero"><span>JL</span><div><strong>Groundwater monitoring review</strong><p>Jordan Lee · Aug 24, 5:42 PM</p></div></div><dl><div><dt>Recorded result</dt><dd>pH 7.4</dd></div><div><dt>Evidence</dt><dd>3 geotagged photos</dd></div><div><dt>Location</dt><dd>52.268° N, 113.811° W</dd></div><div><dt>Sync</dt><dd>Captured offline · uploaded at 5:57 PM</dd></div></dl><div className="note-box"><span>Field note</span>All wells accessible. MW-03 label is faded and should be replaced.</div><div className="review-actions"><button className="secondary-button">Request correction</button><button className="primary-button" onClick={onReview}>Approve evidence</button></div></div></section><aside className="phone-explainer"><div className="phone-mini"><span className="phone-notch" /><p>ROOK FIELD</p><strong>Works without signal.</strong><small>Assignments, checklists, readings, photos, GPS and a visible sync queue are stored securely on-device.</small><i>2 items ready to sync</i></div><h3>Office and field stay connected</h3><p>Consultants configure the work here. Field staff complete it on Android—even offline—and the evidence returns for review when connectivity is restored.</p></aside></div>;
}
