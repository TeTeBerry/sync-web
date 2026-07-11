'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, MapPin, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { track } from '@vercel/analytics';
import { eventPlanPath } from '../lib/event-slug';
import {
  buildFallbackFestivalBudgetEstimate,
  formatEstimateMoney,
  formatEstimateRange,
  type FestivalBudgetEstimate,
} from '../lib/home-budget-estimate';
import type { Locale } from '../lib/i18n';
import type { Activity } from '../lib/types';

type Phase = 'form' | 'loading' | 'result' | 'error';

export function HomeBudgetEstimator({ locale, activities, featuredActivity, variant = 'section' }: {
  locale: Locale; activities: Activity[]; featuredActivity?: Activity; variant?: 'hero' | 'section';
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(String(featuredActivity?.legacyId ?? activities[0]?.legacyId ?? ''));
  const [departure, setDeparture] = useState('');
  const [festivalQuery, setFestivalQuery] = useState(featuredActivity?.title ?? featuredActivity?.name ?? '');
  const [festivalMenuOpen, setFestivalMenuOpen] = useState(false);
  const [festivalActiveIndex, setFestivalActiveIndex] = useState(-1);
  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState('');
  const [estimate, setEstimate] = useState<FestivalBudgetEstimate | null>(null);
  const selected = useMemo(() => activities.find((activity) => String(activity.legacyId) === selectedId), [activities, selectedId]);
  const matchingFestivals = useMemo(() => {
    const query = festivalQuery.trim().toLocaleLowerCase();
    if (!query) return activities;
    return activities.filter((activity) => `${activity.title ?? activity.name} ${activity.city ?? ''} ${activity.area ?? ''}`.toLocaleLowerCase().includes(query));
  }, [activities, festivalQuery]);
  const zh = locale === 'zh';
  useEffect(() => {
    track('homepage_budget_estimator_viewed', { festival_id: selected?.legacyId, festival_slug: selectedId || null });
  }, [selected?.legacyId, selectedId]);

  const estimateTrip = () => {
    if (!selected) {
      setError(zh ? '请从列表中选择一个电音节。' : 'Choose a festival from the list.');
      return;
    }
    if (!departure.trim()) {
      setError(zh ? '请输入你的出发城市。' : 'Tell us where you are travelling from.');
      return;
    }
    setError(''); setPhase('loading');
    track('homepage_budget_estimate_started', { festival_id: selected.legacyId, departure_city: departure.trim() });
    window.setTimeout(() => {
      try {
        const next = buildFallbackFestivalBudgetEstimate(selected, departure, locale);
        setEstimate(next); setPhase('result');
        track('homepage_budget_estimate_succeeded', { festival_id: selected.legacyId, festival_slug: next.festivalSlug, departure_city: next.departureCity, currency: next.currency, estimate_type: 'fallback' });
      } catch {
        setPhase('error');
        track('homepage_budget_estimate_failed', { festival_id: selected.legacyId });
      }
    }, 650);
  };

  const continueToPlan = () => {
    if (!selected || !estimate) return;
    track('homepage_budget_plan_cta_clicked', { festival_id: selected.legacyId, festival_slug: estimate.festivalSlug, departure_city: estimate.departureCity, currency: estimate.currency, estimate_type: 'fallback' });
    const params = new URLSearchParams({ origin: estimate.departureCity, estimate: String(estimate.totalEstimate), nights: String(estimate.tripNights), currency: estimate.currency, breakdown: JSON.stringify(estimate.breakdown) });
    router.push(`${eventPlanPath(locale, selected)}?${params.toString()}`);
  };

  const chooseFestival = (activity: Activity) => {
    setSelectedId(String(activity.legacyId));
    setFestivalQuery(activity.title ?? activity.name);
    setFestivalMenuOpen(false);
  };

  const handleFestivalKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setFestivalMenuOpen(true);
      setFestivalActiveIndex((index) => Math.min(Math.max(index + 1, 0), Math.max(0, matchingFestivals.length - 1)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setFestivalMenuOpen(true);
      setFestivalActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && festivalMenuOpen) {
      event.preventDefault();
      const active = matchingFestivals[festivalActiveIndex];
      if (active) chooseFestival(active);
    } else if (event.key === 'Escape') {
      setFestivalMenuOpen(false);
    }
  };

  return <article className={`budget-entry budget-entry--${variant}`} aria-live="polite">
    {phase === 'result' && estimate ? <section className="budget-reveal" aria-label={zh ? '行程预算预估' : 'Festival trip budget estimate'}>
      <div className="budget-reveal__identity"><p>{estimate.festivalName}</p><span>{estimate.festivalCity}{estimate.festivalCity && estimate.festivalCountry ? ', ' : ''}{estimate.festivalCountry} · {zh ? `从 ${estimate.departureCity} 出发` : `from ${estimate.departureCity}`}</span></div>
      <div className="budget-reveal__total"><span>{zh ? '预估行程预算' : 'Estimated trip budget'}</span><strong>{formatEstimateMoney(estimate.totalEstimate, estimate.currency, locale)}</strong><small>{zh ? `典型区间 ${formatEstimateRange(estimate, locale)}` : `Typical range ${formatEstimateRange(estimate, locale)}`}</small></div>
      <div className="budget-reveal__rows" aria-label={zh ? '预算明细' : 'Cost breakdown'}>
        {[[zh ? '电音节门票' : 'Festival ticket', estimate.breakdown.ticket], [zh ? '往返交通' : 'Round-trip travel', estimate.breakdown.flight], [zh ? `住宿 · ${estimate.tripNights} 晚` : `Hotel · ${estimate.tripNights} nights`, estimate.breakdown.hotel], [zh ? '餐饮与本地交通' : 'Food & local transport', estimate.breakdown.foodAndLocalTransport]].map(([label, value]) => <p key={String(label)}><span>{label}</span><b>{formatEstimateMoney(value as number, estimate.currency, locale)}</b></p>)}
      </div>
      <p className="budget-reveal__context">{zh ? '按典型出行成本估算。最终价格会随日期和余位变化。' : 'Estimated from typical travel costs. Final prices change with dates and availability.'}</p>
      <button className="budget-entry__submit" type="button" onClick={continueToPlan}>{zh ? '开始完整规划' : 'Build My Full Festival Plan'} <ArrowRight size={16} aria-hidden /></button>
      <button className="budget-entry__quiet" type="button" onClick={() => { setPhase('form'); track('homepage_budget_departure_changed', { festival_id: estimate.festivalId }); }}><RotateCcw size={14} aria-hidden /> {zh ? '修改出发城市' : 'Change departure city'}</button>
    </section> : phase === 'loading' ? <section className="budget-entry__loading budget-entry__loading--estimate" aria-label={zh ? '正在生成旅程预估' : 'Generating trip estimate'}><div className="budget-entry__estimate-pulse" aria-hidden><span /><span /><span /></div><p>{zh ? '正在预估你的电音节旅程…' : 'Estimating your festival journey…'}</p><span>{zh ? '查看常见交通、住宿、门票与本地成本。' : 'Checking typical flights, stays, tickets and local costs.'}</span></section> : phase === 'error' ? <div className="budget-entry__error"><p>{zh ? '暂时无法预估这段行程。' : 'We couldn’t estimate this trip right now.'}</p><span>{zh ? '你仍可进入 Raven Planner 手动规划。' : 'You can still continue to Raven Planner and build your trip manually.'}</span><button type="button" onClick={() => setPhase('form')}>{zh ? '重试' : 'Try again'}</button>{selected ? <button type="button" onClick={() => router.push(eventPlanPath(locale, selected))}>{zh ? '进入 Planner' : 'Continue to Planner'}</button> : null}</div> : <div className="budget-entry__form">
      <label><span>{zh ? '电音节' : 'Festival'}</span><div className="budget-entry__festival-select"><input className="budget-entry__festival" type="search" role="combobox" aria-expanded={festivalMenuOpen} aria-controls="home-festival-options" aria-autocomplete="list" value={festivalQuery} placeholder={zh ? '选择电音节' : 'Select Festival'} onFocus={() => { setFestivalMenuOpen(true); setFestivalActiveIndex(-1); }} onBlur={() => window.setTimeout(() => setFestivalMenuOpen(false), 120)} onKeyDown={handleFestivalKeyDown} onChange={(event) => { const value = event.target.value; setFestivalQuery(value); setFestivalMenuOpen(true); setFestivalActiveIndex(-1); const match = activities.find((activity) => (activity.title ?? activity.name) === value); setSelectedId(match ? String(match.legacyId) : ''); }} /><ChevronDown className="budget-entry__festival-chevron" size={16} aria-hidden />{festivalMenuOpen ? <div className="budget-entry__festival-options" id="home-festival-options" role="listbox" aria-label={zh ? '电音节选项' : 'Festival options'}>{matchingFestivals.length ? matchingFestivals.map((activity, index) => <button key={activity.legacyId} type="button" role="option" aria-selected={String(activity.legacyId) === selectedId} className={index === festivalActiveIndex ? 'is-active' : ''} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseFestival(activity)}><span>{activity.title ?? activity.name}</span>{activity.city || activity.area ? <small>{[activity.city, activity.area].filter(Boolean).join(', ')}</small> : null}</button>) : <p>{zh ? '没有匹配的电音节。' : 'No festivals match that search.'}</p>}</div> : null}</div></label>
      <label><span>{zh ? '从哪里出发' : 'Flying From'}</span><div className="budget-entry__origin"><MapPin size={17} aria-hidden /><input value={departure} onChange={(event) => setDeparture(event.target.value)} placeholder={zh ? '你从哪里出发？' : 'Where are you traveling from?'} onKeyDown={(event) => { if (event.key === 'Enter') estimateTrip(); }} /></div></label>
      {error ? <p className="budget-entry__validation" role="alert">{error}</p> : null}
      <button className="budget-entry__submit" type="button" onClick={estimateTrip}>{zh ? '预估我的行程' : 'Estimate My Trip'} <ArrowRight size={16} aria-hidden /></button>
      <p className="budget-entry__note">{zh ? '即时预估 · 无需注册' : 'Instant estimate · No account required'}</p>
    </div>}
  </article>;
}
