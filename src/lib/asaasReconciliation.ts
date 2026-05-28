// Engine de conciliação Asaas <-> lançamentos manuais.
// Classifica cada cobrança vinda do Asaas como já vinculada, sugestão de
// casamento (para o usuário confirmar a baixa) ou órfã (sem par local).

export interface AsaasCharge {
  id: string;
  customerId: string | null;
  customerName: string | null;
  localClientId: string | null;
  value: number;
  dueDate: string;
  status: string;
  billingType: string | null;
  description: string | null;
  externalReference: string | null;
  invoiceUrl: string | null;
  paymentDate: string | null;
  confirmedDate: string | null;
}

export interface ReconcileReceivable {
  id: string;
  asaas_payment_id: string | null;
  amount: number;
  due_date: string;
  status: string;
  client_id: string | null;
  payer_name: string | null;
  description: string | null;
}

export type MatchConfidence = 'high' | 'medium' | 'low';

export interface LinkedPair {
  charge: AsaasCharge;
  receivable: ReconcileReceivable;
}

export interface SuggestedPair {
  charge: AsaasCharge;
  receivable: ReconcileReceivable;
  confidence: MatchConfidence;
  reason: string;
}

export interface ReconciliationResult {
  linked: LinkedPair[];
  suggested: SuggestedPair[];
  orphans: AsaasCharge[];
}

const AMOUNT_TOLERANCE = 0.005;
const DATE_WINDOW_DAYS = 5;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value: string | null | undefined): value is string =>
  !!value && UUID_RE.test(value);

const amountMatches = (a: number, b: number) =>
  Math.abs(Number(a) - Number(b)) < AMOUNT_TOLERANCE;

const parseDate = (value: string): number => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
};

const dayDiff = (a: string, b: string): number =>
  Math.abs(parseDate(a) - parseDate(b)) / 86_400_000;

const normalizeName = (value: string | null | undefined): string =>
  (value || '').toLowerCase().trim().replace(/\s+/g, ' ');

const clientMatches = (charge: AsaasCharge, r: ReconcileReceivable): boolean => {
  if (charge.localClientId && r.client_id && charge.localClientId === r.client_id) {
    return true;
  }
  const chargeName = normalizeName(charge.customerName);
  const payerName = normalizeName(r.payer_name);
  if (chargeName && payerName) {
    return chargeName === payerName || chargeName.includes(payerName) || payerName.includes(chargeName);
  }
  return false;
};

interface Candidate {
  charge: AsaasCharge;
  receivable: ReconcileReceivable;
  confidence: MatchConfidence;
  reason: string;
  rank: number; // maior = melhor (para desempate dentro da mesma banda)
}

const CONFIDENCE_ORDER: Record<MatchConfidence, number> = { high: 3, medium: 2, low: 1 };

function evaluate(charge: AsaasCharge, r: ReconcileReceivable): Candidate | null {
  if (!amountMatches(charge.value, r.amount)) return null;

  const sameDate = charge.dueDate === r.due_date;
  const nearDate = dayDiff(charge.dueDate, r.due_date) <= DATE_WINDOW_DAYS;
  const sameClient = clientMatches(charge, r);

  let confidence: MatchConfidence;
  const reasons: string[] = ['valor igual'];

  if (sameDate) {
    confidence = 'high';
    reasons.push('vencimento igual');
    if (sameClient) reasons.push('mesmo cliente');
  } else if (nearDate || sameClient) {
    confidence = 'medium';
    if (nearDate) reasons.push('vencimento próximo');
    if (sameClient) reasons.push('mesmo cliente');
  } else {
    confidence = 'low';
  }

  // rank: prioriza mesma data, depois proximidade de data, depois cliente
  const rank =
    (sameDate ? 1000 : 0) +
    (sameClient ? 100 : 0) +
    Math.max(0, DATE_WINDOW_DAYS - dayDiff(charge.dueDate, r.due_date));

  return { charge, receivable: r, confidence, reason: reasons.join(' + '), rank };
}

/**
 * Classifica as cobranças do Asaas contra os lançamentos locais.
 * Casamento guloso 1:1: cada lançamento é consumido por no máximo uma cobrança.
 */
export function classifyCharges(
  charges: AsaasCharge[],
  receivables: ReconcileReceivable[]
): ReconciliationResult {
  const byId = new Map(receivables.map((r) => [r.id, r]));
  const byAsaasPaymentId = new Map(
    receivables.filter((r) => r.asaas_payment_id).map((r) => [r.asaas_payment_id as string, r])
  );

  const linked: LinkedPair[] = [];
  const consumedReceivableIds = new Set<string>();
  const unlinkedCharges: AsaasCharge[] = [];

  // Passo 1 — vínculos exatos (asaas_payment_id ou externalReference == id local)
  for (const charge of charges) {
    const byPayment = byAsaasPaymentId.get(charge.id);
    const byExternal = isUuid(charge.externalReference) ? byId.get(charge.externalReference) : undefined;
    const receivable = byPayment || byExternal;

    if (receivable) {
      linked.push({ charge, receivable });
      consumedReceivableIds.add(receivable.id);
    } else {
      unlinkedCharges.push(charge);
    }
  }

  // Passo 2 — candidatos por valor, entre lançamentos manuais ainda disponíveis
  const pool = receivables.filter(
    (r) => !r.asaas_payment_id && !consumedReceivableIds.has(r.id)
  );

  const candidates: Candidate[] = [];
  for (const charge of unlinkedCharges) {
    for (const r of pool) {
      const candidate = evaluate(charge, r);
      if (candidate) candidates.push(candidate);
    }
  }

  // Ordena por confiança e depois por rank — atribui de forma gulosa 1:1
  candidates.sort(
    (a, b) => CONFIDENCE_ORDER[b.confidence] - CONFIDENCE_ORDER[a.confidence] || b.rank - a.rank
  );

  const suggested: SuggestedPair[] = [];
  const matchedChargeIds = new Set<string>();
  for (const c of candidates) {
    if (matchedChargeIds.has(c.charge.id) || consumedReceivableIds.has(c.receivable.id)) continue;
    suggested.push({
      charge: c.charge,
      receivable: c.receivable,
      confidence: c.confidence,
      reason: c.reason,
    });
    matchedChargeIds.add(c.charge.id);
    consumedReceivableIds.add(c.receivable.id);
  }

  const orphans = unlinkedCharges.filter((charge) => !matchedChargeIds.has(charge.id));

  return { linked, suggested, orphans };
}
