"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { canCorrectReconciliationSubmission } from "@/lib/ai/reconciliation-form-error";

type Decision = "confirmed_billed" | "confirmed_not_billed" | "inconclusive";

export default function AiReconciliationForm({ requestId, provider }: { requestId: string; provider: string }) {
  const router = useRouter();
  const [decision, setDecision] = useState<Decision>("inconclusive");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [rationale, setRationale] = useState("");
  const [billedCost, setBilledCost] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [normalizedCost, setNormalizedCost] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || success) return;
    const key = idempotencyKey || crypto.randomUUID();
    setIdempotencyKey(key);
    setLocked(true);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/ai-reconciliation/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          requestId,
          idempotencyKey: key,
          decision,
          provider,
          evidenceReference,
          rationale,
          ...(decision === "confirmed_billed" ? {
            providerBilledCost: Number(billedCost),
            providerBilledCurrency: currency,
            normalizedCostTwd: Number(normalizedCost),
          } : {}),
        }),
      });
      const data = await response.json() as { error?: string; disposition?: string; reason?: string };
      if (!response.ok) {
        // 400/413 are guaranteed to occur before the privileged RPC. No
        // idempotency record or ledger mutation can exist, so allow correction.
        // Keep the key and payload locked for every other failure: those paths
        // may have reached the database and must be retried byte-for-byte.
        if (canCorrectReconciliationSubmission(response.status)) {
          setLocked(false);
          setIdempotencyKey("");
        }
        throw new Error(data.error ?? "核對失敗。");
      }
      setSuccess(data.disposition === "replayed" ? "相同核對已記錄，未重複入帳。" : "核對結果已原子化記錄。");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "核對失敗。請保留相同內容與核對鍵再試。");
      // Keep the submitted payload and key immutable after an uncertain response.
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 12, padding: 13, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, display: "grid", gap: 9 }}>
      <strong style={{ fontSize: 12 }}>人工核對與結案</strong>
      <label style={{ display: "grid", gap: 4, fontSize: 11 }}>
        核對結論
        <select value={decision} onChange={e => setDecision(e.target.value as Decision)} disabled={locked || busy} style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 6, background: "white" }}>
          <option value="inconclusive">證據不足，維持預算保留</option>
          <option value="confirmed_billed">確認供應商已扣款</option>
          <option value="confirmed_not_billed">確認供應商未扣款</option>
        </select>
      </label>
      <label style={{ display: "grid", gap: 4, fontSize: 11 }}>
        證據參照（供應商後台紀錄 ID、帳單項目或內部工單，不要貼 API Key）
        <input required minLength={8} maxLength={500} value={evidenceReference} onChange={e => setEvidenceReference(e.target.value)} disabled={locked || busy} style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} />
      </label>
      <label style={{ display: "grid", gap: 4, fontSize: 11 }}>
        核對理由（至少 20 字）
        <textarea required minLength={20} maxLength={2000} value={rationale} onChange={e => setRationale(e.target.value)} disabled={locked || busy} rows={3} style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 6, resize: "vertical" }} />
      </label>
      {decision === "confirmed_billed" && <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 }}>
          <label style={{ display: "grid", gap: 4, fontSize: 11 }}>供應商扣款金額<input required type="number" min="0" max="9999999999.99999999" step="any" value={billedCost} onChange={e => setBilledCost(e.target.value)} disabled={locked || busy} style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} /></label>
          <label style={{ display: "grid", gap: 4, fontSize: 11 }}>幣別<input required pattern="[A-Z]{3}" minLength={3} maxLength={3} value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} disabled={locked || busy} style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} /></label>
          <label style={{ display: "grid", gap: 4, fontSize: 11 }}>換算後 TWD 成本<input required type="number" min="0" max="9999999999.99999999" step="any" value={normalizedCost} onChange={e => setNormalizedCost(e.target.value)} disabled={locked || busy} style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 6 }} /></label>
        </div>
        <p style={{ margin: 0, color: "#9a3412", fontSize: 10 }}>確認扣款後，系統會結算預留預算並將請求標記為失敗（不會偽造或補送 AI 回覆）。</p>
      </>}
      {error && <p role="alert" style={{ color: "#b42318", fontSize: 11, margin: 0 }}>{error}</p>}
      {success && <p role="status" style={{ color: "#166534", fontSize: 11, margin: 0 }}>{success}</p>}
      {locked && !success && <p style={{ color: "#64748b", fontSize: 10, margin: 0 }}>為保護冪等性，送出後已鎖定本次內容與核對鍵，重試時會沿用相同資料。</p>}
      <button type="submit" disabled={busy || Boolean(success) || !evidenceReference.trim() || rationale.trim().length < 20 || (decision === "confirmed_billed" && (!billedCost || !normalizedCost))} style={{ justifySelf: "start", border: 0, borderRadius: 7, background: "#315d91", color: "white", padding: "9px 13px", fontSize: 11, fontWeight: 700, opacity: busy || locked ? 0.6 : 1 }}>
        {busy ? "送出核對中…" : locked ? "使用相同資料重試" : "記錄核對結果"}
      </button>
    </form>
  );
}
