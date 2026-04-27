import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  styles,
  COLOR,
  fmtMoney,
  fmtDate,
  shortId,
  statusBadgeColors,
} from "./styles";
import type { Invoice, Job, Client, LineItem } from "@/lib/types";

interface Props {
  invoice: Invoice;
  job: Pick<Job, "id" | "title" | "address"> | null;
  client: Pick<
    Client,
    "id" | "contact_name" | "company_name" | "email" | "phone" | "address"
  > | null;
}

export function InvoicePDF({ invoice, job, client }: Props) {
  const items = (invoice.line_items ?? []) as LineItem[];
  const badge = statusBadgeColors(invoice.status);
  const taxPct = Number(invoice.tax_rate ?? 0);
  const remaining = Math.max(
    0,
    Number(invoice.total ?? 0) - Number(invoice.amount_paid ?? 0),
  );

  return (
    <Document
      title={`Invoice ${shortId(invoice.id)} — Roachwood`}
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
            <Text style={styles.metaTitle}>INVOICE</Text>
            <Text style={styles.metaLine}>
              <Text style={styles.metaLabel}>NO. </Text>
              {shortId(invoice.id)}
            </Text>
            <Text style={styles.metaLine}>
              <Text style={styles.metaLabel}>ISSUED </Text>
              {fmtDate(invoice.created_at)}
            </Text>
            {invoice.due_date ? (
              <Text style={styles.metaLine}>
                <Text style={styles.metaLabel}>DUE </Text>
                {fmtDate(invoice.due_date)}
              </Text>
            ) : null}
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.fg }]}>
                {invoice.status}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.rule} />

        {/* Parties */}
        <View style={styles.parties}>
          <View style={styles.party}>
            <Text style={styles.partyLabel}>Bill to</Text>
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
              {job?.title ?? invoice.title}
            </Text>
            {job?.address ? (
              <Text style={styles.partyMuted}>{job.address}</Text>
            ) : null}
            <Text style={[styles.partyMuted, { marginTop: 6 }]}>
              {invoice.title}
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
            <Text style={styles.totalValue}>{fmtMoney(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax ({taxPct}%)</Text>
            <Text style={styles.totalValue}>
              {fmtMoney(invoice.tax_amount)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Amount paid</Text>
            <Text style={styles.totalValue}>
              {fmtMoney(invoice.amount_paid)}
            </Text>
          </View>
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>
              {remaining > 0 ? "Balance due" : "Total"}
            </Text>
            <Text
              style={[
                styles.grandValue,
                remaining === 0 ? { color: "#27613a" } : {},
              ]}
            >
              {fmtMoney(remaining > 0 ? remaining : invoice.total)}
            </Text>
          </View>
        </View>

        {/* Payment details */}
        {invoice.due_date && remaining > 0 ? (
          <View style={[styles.notes, { borderColor: COLOR.gold }]}>
            <Text style={styles.notesLabel}>Payment</Text>
            <Text style={styles.notesText}>
              Balance of {fmtMoney(remaining)} due {fmtDate(invoice.due_date)}.
            </Text>
            {invoice.stripe_payment_link ? (
              <Text
                style={[styles.notesText, { color: COLOR.gold, marginTop: 4 }]}
              >
                Pay online: {invoice.stripe_payment_link}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Notes */}
        {invoice.notes ? (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
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
