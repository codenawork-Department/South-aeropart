import { escapeHtml } from "./html";

export function renderOrderNoteEmail(note: string | null | undefined): string {
  if (!note) return "";
  return `<tr><td style="padding:0 32px 28px 32px;">
    <div style="font-size:12px;font-weight:bold;color:#A3A3A3;margin-bottom:8px;">หมายเหตุจากลูกค้า / Customer note</div>
    <div data-customer-order-note style="font-size:13px;line-height:1.6;color:#D4D4D4;white-space:pre-wrap;overflow-wrap:anywhere;">${escapeHtml(note)}</div>
  </td></tr>`;
}
