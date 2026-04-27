import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  styles,
  fmtMoney,
  fmtDate,
  shortId,
  statusBadgeColors,
} from "./styles";
import type { Estimate, Job, Client, LineItem } from "@/lib/types";

interface Props {
  estimate: Estimate;
  job: Pick<Job, "id" | "title" | "address"> | null;
  client: Pick<
    Client,
    "id" | "contact_name" | "company_name" | "email" | "phone" | "address"
  > | null;
}

export function EstimatePDF({ estimate, job, client }: Props) {
  const items = (estimate.line_items ?? []) as LineItem[];
  const badge = statusBadgeColors(estimate.status);
  const taxPct = Number(estimate.tax_rate ?? 0);

  return (
    <Document
      title={`Estimate ${shortId(estimate.id)} — Roachwood`}
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
            <Text style={styles.metaTitle}>ESTIMATE</Text>
            <Text style={styles.metaLine}>
              <Text style={styles.metaLabel}>NO. </Text>
              {shortId(estimate.id)}
            </Text>
            <Text style={styles.metaLine}>
              <Text style={styles.metaLabel}>DATE </Text>
              {fmtDate(estimate.created_at)}
            </Text>
            <View
              style={[styles.badge, { backgroundColor: badge.bg }]}
            >
              <Text style={[styles.badgeText, { color: badge.fg }]}>
                {estimate.status}
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
              {job?.title ?? estimate.title}
            </Text>
            {job?.address ? (
              <Text style={styles.partyMuted}>{job.address}</Text>
            ) : null}
            <Text style={[styles.partyMuted, { marginTop: 6 }]}>
              {estimate.title}
            </Text>
          </View>
        </View>

        {/* Line items */}
        <View style={styles.table}>
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
            <Text style={styles.totalValue}>{fmtMoney(estimate.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax ({taxPct}%)</Text>
            <Text style={styles.totalValue}>
              {fmtMoney(estimate.tax_amount)}
            </Text>
          </View>
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandValue}>{fmtMoney(estimate.total)}</Text>
          </View>
        </View>

        {/* Notes */}
        {estimate.notes ? (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{estimate.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.footer} fixed>
          Thank you for your business — Roachwood | roachwood.co | (586)
          344-0982
        </Text>
      </Page>
    </Document>
  );
}
