import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { galleryPublicUrl } from "@/lib/storage";
import type {
  Testimonial,
  GalleryItem,
  SiteSettings,
} from "@/lib/types";

const GALLERY_FALLBACK = [
  "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=900&q=80",
  "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=600&q=80",
  "https://images.unsplash.com/photo-1604709177225-055f99402ea3?w=600&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80",
  "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80",
];

export default async function HomePage() {
  const supabase = await createClient();

  const [testimonialsRes, galleryRes, settingsRes] = await Promise.all([
    supabase
      .from("testimonials")
      .select("*")
      .eq("visible", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("gallery_photos")
      .select("*")
      .eq("visible", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle<SiteSettings>(),
  ]);

  const testimonials = (testimonialsRes.data ?? []) as Testimonial[];
  const gallery = (galleryRes.data ?? []) as GalleryItem[];
  const settings = settingsRes.data;

  // Pad gallery to 5 with placeholder images so the layout never breaks.
  const galleryUrls: { src: string; alt: string }[] = [
    ...gallery.map((g) => ({
      src: galleryPublicUrl(g.storage_path),
      alt: g.title,
    })),
    ...GALLERY_FALLBACK.slice(gallery.length).map((src, i) => ({
      src,
      alt: `Roachwood project ${gallery.length + i + 1}`,
    })),
  ].slice(0, 5);

  const phone = settings?.phone ?? "(586) 344-0982";
  const phoneHref = `tel:${(settings?.phone ?? "").replace(/[^0-9+]/g, "") || "+15863440982"}`;
  const email = settings?.email ?? "info@roachwood.co";
  const serviceArea = settings?.service_area ?? "Scottsdale & Greater Phoenix Area";

  return (
    <>
      {/* HERO */}
      <section className="relative h-[100vh] min-h-[700px] flex items-end overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(19,19,21,0.82) 28%, rgba(19,19,21,0) 70%), linear-gradient(to top, rgba(19,19,21,0.45) 0%, transparent 35%), url('https://images.stockcake.com/public/f/7/a/f7a4ec31-9c8b-469a-b0ec-c9d4c40f1477_large/sawdust-catches-light-stockcake.jpg')",
          }}
        />
        <div className="relative z-10 px-6 md:px-16 pb-24 max-w-3xl">
          <p className="rw-eyebrow">
            Custom Cabinetry &amp; Home Improvements · Scottsdale, AZ
          </p>
          <h1 className="rw-display mt-7 text-5xl md:text-7xl leading-[1.05] text-white">
            Built right.
            <br />
            <span className="italic text-charcoal-50">Made to last.</span>
          </h1>
          <blockquote className="mt-9 border-l-2 border-gold-500 pl-5">
            <p className="font-display italic text-lg text-charcoal-200 leading-relaxed">
              &ldquo;Great work isn&rsquo;t added at the end. It&rsquo;s built
              in from day one.&rdquo;
            </p>
            <cite className="mt-2.5 block text-[11px] not-italic uppercase tracking-[0.2em] text-gold-500/80">
              — Colin Roach, Founder
            </cite>
          </blockquote>
          <a
            href="#contact"
            className="mt-12 inline-flex h-12 items-center gap-2 bg-gold-500 px-10 text-xs font-semibold uppercase tracking-[0.22em] text-charcoal-950 hover:bg-gold-400 transition shadow-gold-glow"
          >
            Discuss Your Project <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <div className="absolute bottom-10 right-16 hidden md:flex flex-col items-center gap-2.5">
          <span className="block h-16 w-px bg-gradient-to-b from-gold-500 to-transparent" />
          <span
            className="text-[10px] uppercase tracking-[0.25em] text-gold-500/70"
            style={{ writingMode: "vertical-rl" }}
          >
            Scroll
          </span>
        </div>
      </section>

      {/* WHAT WE DO */}
      <section id="what-we-do" className="bg-charcoal-800 px-6 md:px-16 py-28">
        <div className="grid md:grid-cols-2 gap-20 items-end mb-20">
          <div>
            <p className="rw-eyebrow">What We Do</p>
            <h2 className="rw-display mt-4 text-4xl md:text-6xl leading-[1.1] text-charcoal-50">
              The
              <br />
              Workshop
            </h2>
            <span className="mt-7 block h-0.5 w-12 bg-gold-500" />
          </div>
          <p className="text-charcoal-300 text-lg leading-[1.8] max-w-xl">
            At Roachwood, we specialize in custom cabinetry and high-quality
            home improvements — from kitchens and built-ins to decks and full
            interior updates. We don&rsquo;t build houses from the ground up.
            We improve them, refine them, and make them fit the way our
            clients actually live.
          </p>
        </div>

        {/* Photo grid (DB-driven, falls back to placeholders if needed) */}
        <div className="grid grid-cols-3 grid-rows-2 gap-[3px] mb-20 h-[560px]">
          {/* eslint-disable @next/next/no-img-element */}
          <img
            src={galleryUrls[0].src}
            alt={galleryUrls[0].alt}
            className="row-span-2 h-full w-full object-cover brightness-90 hover:brightness-100 hover:scale-[1.04] transition duration-700"
          />
          <img
            src={galleryUrls[1].src}
            alt={galleryUrls[1].alt}
            className="h-full w-full object-cover brightness-90 hover:brightness-100 hover:scale-[1.04] transition duration-700"
          />
          <img
            src={galleryUrls[2].src}
            alt={galleryUrls[2].alt}
            className="h-full w-full object-cover brightness-90 hover:brightness-100 hover:scale-[1.04] transition duration-700"
          />
          <img
            src={galleryUrls[3].src}
            alt={galleryUrls[3].alt}
            className="h-full w-full object-cover brightness-90 hover:brightness-100 hover:scale-[1.04] transition duration-700"
          />
          <img
            src={galleryUrls[4].src}
            alt={galleryUrls[4].alt}
            className="h-full w-full object-cover brightness-90 hover:brightness-100 hover:scale-[1.04] transition duration-700"
          />
          {/* eslint-enable @next/next/no-img-element */}
        </div>

        {/* Services */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-gold-500/10 border border-gold-500/10">
          {[
            {
              num: "01",
              title: "Custom Kitchens",
              copy: "Solid wood construction, masterful joinery, and a layout designed around how you actually cook and live.",
            },
            {
              num: "02",
              title: "Custom Cabinetry & Built-ins",
              copy: "Libraries, mudrooms, and custom storage solutions crafted with meticulous attention to detail and finish.",
            },
            {
              num: "03",
              title: "Decks & Outdoor Spaces",
              copy: "Outdoor living built to withstand the elements using premium materials and uncompromising structural integrity.",
            },
            {
              num: "04",
              title: "Interior Updates & Renovations",
              copy: "Full interior updates that bring older homes into the way you live today — while respecting their original character.",
            },
          ].map((s) => (
            <article
              key={s.num}
              className="bg-charcoal-800 hover:bg-charcoal-700 transition px-8 py-10"
            >
              <p className="font-display text-3xl text-gold-500/20 leading-none">
                {s.num}
              </p>
              <h3 className="mt-6 font-display text-lg text-charcoal-50 leading-snug">
                {s.title}
              </h3>
              <p className="mt-3.5 text-sm text-charcoal-300 leading-[1.75]">
                {s.copy}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* APPROACH */}
      <section
        id="approach"
        className="bg-charcoal-900 px-6 md:px-16 py-32 grid md:grid-cols-2 gap-16 lg:gap-24 items-center"
      >
        <div className="border-l-[3px] border-gold-500 pl-12">
          <blockquote className="font-display italic text-3xl md:text-4xl leading-[1.3] text-charcoal-50">
            &ldquo;Details matter. That&rsquo;s how you build something great
            the first time.&rdquo;
          </blockquote>
          <cite className="mt-7 block text-[11px] not-italic uppercase tracking-[0.22em] text-gold-500">
            — Colin Roach, Founder
          </cite>
        </div>

        <div className="flex flex-col gap-9">
          <p className="rw-eyebrow">Our Approach</p>
          {[
            {
              title: "No Shortcuts",
              copy: "Every joint, every finish, every detail is executed to last decades — not just pass inspection.",
            },
            {
              title: "Thoughtful Planning",
              copy: "We invest time upfront to understand how you live, so the result fits your life — not just the space.",
            },
            {
              title: "Clear Communication",
              copy: "You know where your project stands at every stage. No surprises on timeline or budget.",
            },
            {
              title: "Pride in the Finished Product",
              copy: "We don’t hand off work we wouldn’t put our name on. When we leave, it’s right.",
            },
          ].map((p) => (
            <div key={p.title} className="flex gap-6 items-start">
              <span className="block w-[3px] h-12 bg-gold-500 shrink-0 mt-1" />
              <div>
                <h4 className="font-display text-lg text-charcoal-50">
                  {p.title}
                </h4>
                <p className="mt-2 text-sm text-charcoal-300 leading-[1.75]">
                  {p.copy}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS — DB-driven, hidden if none visible */}
      {testimonials.length > 0 ? (
        <section
          id="testimonials"
          className="bg-charcoal-700/40 px-6 md:px-16 py-24"
        >
          <div className="text-center mb-16">
            <p className="rw-eyebrow">What Clients Say</p>
            <h2 className="rw-display mt-4 text-3xl md:text-5xl text-charcoal-50">
              Built to earn a reputation.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-gold-500/10">
            {testimonials.map((t) => (
              <figure
                key={t.id}
                className="bg-charcoal-700/40 px-10 py-12"
              >
                <div
                  aria-hidden
                  className="text-gold-500 text-xs tracking-[4px] mb-6"
                >
                  {"★".repeat(t.star_rating)}
                  <span className="text-charcoal-600">
                    {"★".repeat(5 - t.star_rating)}
                  </span>
                </div>
                <blockquote className="font-display italic text-lg text-charcoal-200 leading-[1.7]">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-7">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-500/80">
                    {t.client_name}
                  </p>
                  {t.location ? (
                    <p className="mt-1 text-[11px] tracking-[0.1em] text-charcoal-400">
                      {t.location}
                    </p>
                  ) : null}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {/* FOUNDER */}
      <section
        id="founder"
        className="bg-charcoal-900 px-6 md:px-16 py-32"
      >
        <div className="relative mx-auto max-w-3xl">
          {/* Vertical gold accent — replaces the photo as the visual
              anchor on the left edge. Gradient fades the line out so it
              feels like a flourish rather than a hard rule. */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 top-2 bottom-2 w-px bg-gradient-to-b from-gold-500 via-gold-500/40 to-transparent"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 top-2 h-12 w-[3px] bg-gold-500"
          />

          <div className="pl-8 md:pl-12">
            <p className="rw-eyebrow">Founder&rsquo;s Note</p>
            <h2 className="rw-display mt-3 text-3xl md:text-5xl leading-[1.1] text-charcoal-50">
              &ldquo;If it&rsquo;s worth doing, it&rsquo;s worth building right.&rdquo;
            </h2>
            <p className="mt-10 font-display italic text-xl text-charcoal-200 leading-[1.65]">
              Roachwood was built on pride, craftsmanship, and family influence.
            </p>
            <div className="mt-8 space-y-5 text-[15px] text-charcoal-300 leading-[1.9]">
              <p>
                I come from a family of builders, firefighters, and craftsmen
                who believed in doing things the right way. My father, John
                Roach, was a builder and Deputy Chief, and Steve Lesniak, a
                Fire Chief and master carpenter, had a major influence on how
                I think about work, detail, discipline, and pride in the
                finished product.
              </p>
              <p>
                While studying chemistry at La Salle University, I worked in a
                boutique cabinet shop and found something I genuinely loved —
                building, creating, and seeing a project come to life. After
                earning my master&rsquo;s degree from George Washington
                University, I kept coming back to that same work.
              </p>
              <p>
                Today, I focus on what I enjoy most: working with clients,
                solving problems, and delivering spaces people are proud of —
                whether it&rsquo;s a kitchen, custom cabinetry, a deck, or a
                full home update.
              </p>
              <p>
                I live in Scottsdale with my wife and two young kids, and
                I&rsquo;m active in my community and my faith. That
                foundation shapes how I work and the standard I hold on every
                project.
              </p>
              <p>I take pride in the work — and I stand behind it.</p>
            </div>
            <div className="mt-12 pt-8 border-t border-gold-500/20">
              <p className="font-display italic text-2xl text-charcoal-50">
                Colin Roach
              </p>
              <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-gold-500/70">
                Founder, Roachwood
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section
        id="contact"
        className="bg-charcoal-800 px-6 md:px-16 py-28 grid md:grid-cols-2 gap-16 lg:gap-24 items-start"
      >
        <div>
          <p className="rw-eyebrow">Start a Project</p>
          <h2 className="rw-display mt-4 text-3xl md:text-5xl leading-[1.1] text-charcoal-50">
            Let&rsquo;s build something that lasts.
          </h2>
          <p className="mt-7 text-charcoal-300 leading-[1.85] max-w-md">
            Whether it&rsquo;s a kitchen, custom cabinetry, a deck, or a full
            home update — reach out and let&rsquo;s talk about what you have
            in mind. We serve {serviceArea}.
          </p>

          <div className="mt-12 flex flex-col gap-7">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gold-500 mb-2">
                Direct Line
              </p>
              <a
                href={phoneHref}
                className="font-display text-xl text-charcoal-200 hover:text-gold-500 transition"
              >
                {phone}
              </a>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gold-500 mb-2">
                Email
              </p>
              <a
                href={`mailto:${email}`}
                className="font-display text-xl text-charcoal-200 hover:text-gold-500 transition"
              >
                {email}
              </a>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gold-500 mb-2">
                Workshop
              </p>
              <span className="font-display text-xl text-charcoal-200">
                Visits by appointment
              </span>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gold-500 mb-2">
                Service Area
              </p>
              <span className="font-display text-xl text-charcoal-200">
                {serviceArea}
              </span>
            </div>
          </div>
        </div>

        <form
          className="flex flex-col gap-5"
          action="/api/contact"
          method="post"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="first_name"
                className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-500/70"
              >
                First Name
              </label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                placeholder="John"
                className="bg-charcoal-700 border border-gold-500/15 text-charcoal-50 placeholder:text-charcoal-400/60 px-4 py-3.5 text-sm focus:outline-none focus:border-gold-500 transition"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="last_name"
                className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-500/70"
              >
                Last Name
              </label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                placeholder="Smith"
                className="bg-charcoal-700 border border-gold-500/15 text-charcoal-50 placeholder:text-charcoal-400/60 px-4 py-3.5 text-sm focus:outline-none focus:border-gold-500 transition"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-500/70"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="john@email.com"
              className="bg-charcoal-700 border border-gold-500/15 text-charcoal-50 placeholder:text-charcoal-400/60 px-4 py-3.5 text-sm focus:outline-none focus:border-gold-500 transition"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="phone"
              className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-500/70"
            >
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="(602) 555-0000"
              className="bg-charcoal-700 border border-gold-500/15 text-charcoal-50 placeholder:text-charcoal-400/60 px-4 py-3.5 text-sm focus:outline-none focus:border-gold-500 transition"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="project_type"
              className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-500/70"
            >
              Project Type
            </label>
            <select
              id="project_type"
              name="project_type"
              defaultValue=""
              className="bg-charcoal-700 border border-gold-500/15 text-charcoal-50 px-4 py-3.5 text-sm focus:outline-none focus:border-gold-500 transition"
            >
              <option value="" disabled>
                Select a service
              </option>
              <option>Custom Kitchen</option>
              <option>Custom Cabinetry / Built-ins</option>
              <option>Deck / Outdoor Space</option>
              <option>Interior Renovation</option>
              <option>Other</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="message"
              className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-500/70"
            >
              Tell Us About Your Project
            </label>
            <textarea
              id="message"
              name="message"
              placeholder="Describe your project, timeline, and any specifics..."
              className="bg-charcoal-700 border border-gold-500/15 text-charcoal-50 placeholder:text-charcoal-400/60 px-4 py-3.5 text-sm h-32 resize-none focus:outline-none focus:border-gold-500 transition"
            />
          </div>

          <button
            type="submit"
            className="self-start mt-2 px-12 py-4 bg-transparent border border-gold-500 text-gold-500 text-xs font-semibold uppercase tracking-[0.22em] hover:bg-gold-500 hover:text-charcoal-950 transition"
          >
            Send Inquiry
          </button>
        </form>
      </section>
    </>
  );
}
