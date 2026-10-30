import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { consolidateReportsData, createMockConsolidatedData } from '../services/normalization.service';
import { createSnapshotFromData, getSavedSnapshots } from '../services/snapshot.service';
import { clearDashboardStorage, loadActiveDashboardData, saveActiveDashboardData } from '../storage/dashboard-storage';
import { ExecutiveDashboardPage } from '../pages/ExecutiveDashboardPage';
import { KPIArea } from '../components/KPIArea';

const a = { tenantId: 'synthetic-tenant-a', userId: 'synthetic-admin' };
const b = { tenantId: 'synthetic-tenant-b', userId: 'synthetic-admin' };
const otherUser = { tenantId: a.tenantId, userId: 'synthetic-other-admin' };

describe('Executive laboratory boundaries', () => {
  let stored: Map<string, string>;
  beforeEach(() => {
    stored = new Map();
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
      removeItem: (key: string) => stored.delete(key),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('starts empty, identifies the laboratory and requires explicit demo activation', () => {
    const html = renderToStaticMarkup(<ExecutiveDashboardPage scope={a} />);
    expect(html).toContain('Nenhum registro disponível');
    expect(html).toContain('Laboratório demonstrativo');
    expect(html).toContain('Carregar demonstração fictícia');
    expect(html).not.toContain('184.520');
    expect(html).not.toContain('Faturamento +14.8%');
  });

  it('does not substitute empty imports with commercial demonstration data', () => {
    expect(() => consolidateReportsData([], [], [])).toThrow('Nenhum registro disponível');
    expect(createMockConsolidatedData().dataKind).toBe('demonstration');
  });

  it('preserves a measured zero and marks unavailable account indicators and comparisons', () => {
    const data = consolidateReportsData([{
      data: '2026-10-01', faturamentoBruto: 0, unidadesVendidas: 0, pedidosTotal: 0,
      ticketMedio: 0, visitasTotais: 0, taxaConversao: 0, cancelamentos: 0,
    }], [], []);
    expect(data.dataKind).toBe('local-import');
    expect(data.kpis.faturamentoTotal).toBe(0);
    expect(data.kpis.anunciosAtivos).toBeNull();
    expect(data.kpis.ticketMedio).toBeNull();
    expect(data.kpis.taxaConversaoMedia).toBeNull();
    expect(data.kpis.variacaoFaturamento).toBeNull();
    expect(data.kpis.variacaoVendas).toBeNull();
    const html = renderToStaticMarkup(<KPIArea kpis={data.kpis} />);
    expect(html).toContain('Indisponível');
    expect(html).not.toContain('11.2%');
    expect(html).not.toContain('0.4%');
  });

  it('never guesses an owner for global legacy data', () => {
    stored.set('exec_dash_active_data_v1', JSON.stringify(createMockConsolidatedData()));
    stored.set('exec_dash_snapshots_v1', JSON.stringify([{ id: 'legacy' }]));
    expect(loadActiveDashboardData(a)).toBeNull();
    expect(getSavedSnapshots(a)).toEqual([]);
  });

  it('isolates active data and snapshots across tenants and users, including clearing', () => {
    const data = createMockConsolidatedData('Synthetic demo');
    saveActiveDashboardData(a, data);
    createSnapshotFromData(a, data, 'Synthetic demo');
    expect(loadActiveDashboardData(a)).toEqual(data);
    expect(getSavedSnapshots(a)).toHaveLength(1);
    expect(loadActiveDashboardData(b)).toBeNull();
    expect(loadActiveDashboardData(otherUser)).toBeNull();
    expect(getSavedSnapshots(b)).toEqual([]);
    clearDashboardStorage(b);
    expect(loadActiveDashboardData(a)).toEqual(data);
    clearDashboardStorage(a);
    expect(loadActiveDashboardData(a)).toBeNull();
    expect(getSavedSnapshots(a)).toEqual([]);
  });
});
