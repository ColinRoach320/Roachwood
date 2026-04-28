import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  styles,
  fmtMoney,
  fmtDate,
  shortId,
  statusBadgeColors,
} from "./styles";
import type { ChangeOrder, Job, Client, LineItem } from "@/lib/types";

interface Props {
  changeOrder: ChangeOrder;
  job: Pick<Job, "id" | "title" | "address"> | null;
  client: Pick<
    Client,
    "id" | "contact_name" | "company_name" | "email" | "phone" | "address"
  > | null;
}

export function ChangeOrderPDF({ changeOrder, job, client }: Props) {
  const items = (changeOrder.line_items ?? []) as LineItem[];
  const badge = statusBadgeColors(changeOrder.status);
  const taxPct = Number(changeOrder.tax_rate ?? 0);

  return (
    <Document
      title={`Change order CO-${changeOrder.co_number} — Roachwood`}
      author="Roachwood"
      creator="Roachwood"
    >
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brand}>
            <Text style={styles.brandName}>Roachwood</Text>
            <Text style={styles.brandLine}>(586) 344-0982</Text>
            <Text style={styles.brandLine}>info@roachwood.co</Text>
            <Text style={styles.brandLine}>roachwood.co</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaTitle}>CHANGE ORDER</Text>
            <Text style={styles.metaLine}>
              <Text style={styles.metaLabel}>NO. </Text>
              CO-{changeOrder.co_number} · {shortId(changeOrder.id)}
            </Text>
            <Text style={styles.metaLine}>
              <Text style={styles.metaLabel}>DATE </Text>
              {fmtDate(changeOrder.created_at)}
            </Text>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.fg }]}>
                {changeOrder.status}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.rule} />

        {/* Parties */}
        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.partyLabel}>Prepared for</Text>
            {client ? (
              <>
                <Text style={styles.partyName}>{client.contact_name}</Text>
                {client.company_name ? (
                  <Text style={styles.partyMuted}>{client.company_name}</Text>
                ) : null}
                {client.email ? (
                  <Text style={styles.partyText}>{client.email}</Text>
                ) : null}
                {client.phone ? (
                  <Text style={styles.partyText}>{client.phone}</Text>
                ) : null}
                {client.address ? (
                  <Text style={styles.partyMuted}>{client.address}</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.partyMuted}>—</Text>
            )}
          </View>

          <View style={styles.party}>
            <Text style={styles.partyLabel}>Project</Text>
            <Text style={styles.partyName}>
              {job?.title ?? changeOrder.title}
            </Text>
            {job?.address ? (
              <Text style={styles.partyMuted}>{job.address}</Text>
            ) : null}
            <Text style={[styles.partyMuted, { marginTop: 6 }]}>
              {changeOrder.title}
            </Text>
          </View>
        </View>

        {/* Description */}
        {changeOrder.description ? (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Scope change</Text>
            <Text style={styles.notesText}>{changeOrder.description}</Text>
          </View>
        ) : null}

        {/* Line items */}
        <View style={[styles.table, { marginTop: 16 }]}>
          <View style={styles.tableHead}>
            <Text style={[styles.tableHeadCell, styles.cellDescription]}>
              Description
            </Text>
            <Text style={[styles.tableHeadCell, styles.cellQty]}>Qty</Text>
            <Text style={[styles.tableHeadCell, styles.cellUnit]}>
              Unit price
            </Text>
            <Text style={[styles.tableHeadCell, styles.cellTotal]}>Total</Text>
          </View>
          {items.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={styles.cellDescription}>No line items.</Text>
            </View>
          ) : (
            items.map((it, i) => (
              <View
                key={it.id}
                style={[
                  styles.tableRow,
                  i % 2 === 1 ? styles.tableRowAlt : {},
                ]}
              >
                <Text style={styles.cellDescription}>
                  {it.description || "—"}
                </Text>
                <Text style={styles.cellQty}>{it.quantity}</Text>
                <Text style={styles.cellUnit}>{fmtMoney(it.unit_price)}</Text>
                <Text style={styles.cellTotal}>{fmtMoney(it.total)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>
              {fmtMoney(changeOrder.subtotal)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax ({taxPct}%)</Text>
            <Text style={styles.totalValue}>
              {fmtMoney(changeOrder.tax_amount)}
            </Text>
          </View>
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Change order total</Text>
            <Text style={styles.grandValue}>
              {fmtMoney(changeOrder.total)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {changeOrder.notes ? (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{changeOrder.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.footer} fixed>
          Approval required before this scope change is performed —
          Roachwood | roachwood.co | (586) 344-0982
        </Text>
      </Page>
    </Document>
  );
}
