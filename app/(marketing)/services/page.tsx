import { redirect } from "next/navigation";

// The marketing site is a single page; this route keeps old links working.
export default function ServicesPage() {
  redirect("/#what-we-do");
}
