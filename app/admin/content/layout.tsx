import { ContentTabs } from "@/components/admin/ContentTabs";

export default function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-8">
      <div>
        <p className="rw-eyebrow">Content management</p>
        <h1 className="rw-display mt-2 text-3xl">Public site content</h1>
        <p className="mt-2 max-w-xl text-sm text-charcoal-400">
          Everything in here is what visitors see on roachwood.com. Changes
          go live the moment you save.
        </p>
      </div>
      <ContentTabs />
      <div>{children}</div>
    </div>
  );
}
