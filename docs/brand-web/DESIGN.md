# Promocionales Emocionales — Design System V1

**Status:** Ready for copy and Build preparation  
**Scope:** Home V1 and reusable web foundations  
**Authority:** `PE_VISUAL_DIRECTION_LOCK_V1.md`  
**Not included:** implementation, production changes, new visual territories or final commercial claims

## 1. System principles

1. **Scan before read.** Every section communicates through image, title, one short support line and one action.
2. **Two legitimate entry routes.** Product-led and project-led journeys remain visible and balanced.
3. **Product is tangible.** Physical objects, materials, customization and business use lead the visual story.
4. **Human, not sentimental.** People provide context, scale and purpose; they are not decorative emotion.
5. **Evidence over assertion.** Trust comes from verifiable process and facts, not superlatives.
6. **Low density by default.** Remove components, labels and copy before reducing spacing or type.
7. **Mobile has its own composition.** It is not a compressed desktop.
8. **Technology remains invisible.** The interface communicates help and clarity, not AI.

## 2. Foundations

### 2.1 Color roles

Final color values must be sampled from the current logo and approved visual proposal before Build. The roles below are locked; raw values are not yet authoritative.

| Token | Role | Rule |
|---|---|---|
| `color.brand.action` | Current PE red | Primary actions, active states and small emphasis only |
| `color.brand.action-hover` | Darker PE red | Hover/pressed; maintain AA contrast |
| `color.surface.canvas` | Warm ivory | Default page background |
| `color.surface.white` | White | Cards, navigation and high-clarity areas |
| `color.surface.subtle` | Warm light gray | Section distinction without heavy panels |
| `color.text.primary` | Charcoal | Headlines and body |
| `color.text.secondary` | Warm dark gray | Supporting text |
| `color.text.inverse` | White/ivory | Text on verified dark surfaces |
| `color.border.default` | Warm neutral gray | Quiet dividers and card boundaries |
| `color.focus` | Accessible focus color | Visible on light, dark and red surfaces |
| `color.state.success` | Semantic green | Confirmation only; never a brand substitute |
| `color.state.warning` | Semantic amber | Conditions needing attention |
| `color.state.error` | Semantic red distinct from brand use | Errors and destructive states |

Rules:

- Red should occupy a small minority of any viewport.
- Never use red for long body copy.
- Avoid red-on-black combinations unless contrast is measured.
- Never communicate state through color alone.
- Warm ivory and white may alternate by section; avoid striped-page monotony.

### 2.2 Typography roles

Use the typeface shown in the approved proposal once its exact family and web license are confirmed. Until then, preserve these roles and do not substitute a new brand font.

| Style | Purpose | Desktop target | Mobile target |
|---|---|---:|---:|
| Display | Hero only | 48–64 px | 36–44 px |
| H1 | Page title outside Home | 44–56 px | 34–40 px |
| H2 | Section title | 32–40 px | 28–34 px |
| H3 | Card/group title | 22–28 px | 20–24 px |
| Body L | Lead/support | 18–20 px | 17–18 px |
| Body | Standard text | 16–18 px | 16–17 px |
| Label | Navigation/control | 14–16 px | 14–16 px |
| Caption | Metadata | 12–14 px | 12–14 px |

Rules:

- Body line height: 1.45–1.65.
- Headline line height: 1.05–1.2.
- Maximum copy width: approximately 60–70 characters; Hero support should be shorter.
- Use sentence case, not all caps, for interface copy.
- Limit each section to three visible hierarchy levels.
- Do not shrink body text to fit excess content; edit the content.

### 2.3 Spacing

Use an 8 px base rhythm with 4 px increments only for fine alignment.

| Token | Value | Typical use |
|---|---:|---|
| `space.1` | 4 px | Icon/text correction |
| `space.2` | 8 px | Tight internal gap |
| `space.3` | 12 px | Label/control gap |
| `space.4` | 16 px | Standard internal gap |
| `space.6` | 24 px | Card padding mobile |
| `space.8` | 32 px | Group spacing |
| `space.12` | 48 px | Section internal separation |
| `space.16` | 64 px | Mobile section padding |
| `space.20` | 80 px | Desktop section padding minimum |
| `space.24` | 96 px | Desktop section padding preferred |

Density rule: if a section needs more than three nested spacing levels, simplify its structure.

### 2.4 Layout

- Desktop content max width: 1200–1280 px.
- Desktop horizontal gutter: 32–64 px depending on viewport.
- Tablet gutter: 24–32 px.
- Mobile gutter: 20 px preferred; 16 px minimum.
- Desktop grid: 12 columns.
- Mobile grid: 4 columns.
- Reading columns should remain narrower than the page container.
- Breakpoints must follow content stress, with initial QA at 390, 768, 1024 and 1440 px.

### 2.5 Radius, border and shadow

- Use one restrained radius family across cards and controls.
- Buttons may use a slightly stronger radius than content cards, but not pill styling everywhere.
- Borders are preferred to heavy shadows.
- Shadows only indicate elevation or overlay, not general decoration.
- Avoid glassmorphism, gradients without purpose and dashboard-like panels.

### 2.6 Iconography

- Simple line or restrained solid icons from one family.
- Icons support recognition; they do not replace labels on critical actions.
- One icon per process step or functional control is sufficient.
- Do not decorate every heading or card.
- No hearts, sparkles, robots or generic “innovation” symbols.

### 2.7 Motion

- Motion is optional and subordinate.
- Use 150–250 ms for control transitions.
- Prefer opacity and small position changes.
- No auto-rotating carousels.
- No parallax required to understand product or action.
- Respect `prefers-reduced-motion`.

## 3. Component rules

### 3.1 Header

**Purpose:** identify the brand and provide immediate access to the primary routes.

**Layout:** current logo left; compact primary navigation; primary action right on desktop. Mobile uses logo, optional search access and menu trigger.

**Hierarchy:** logo → essential navigation → action.

**Spacing:** 72–88 px desktop height; 60–72 px mobile target.

**Responsive:** collapse to a simple menu before labels wrap. Do not preserve desktop navigation at the cost of legibility.

**States:** default, hover, focus, current page, menu open.

**Do:** keep only navigation needed for product discovery, solutions and contact/project entry.

**Don't:** use a megamenu without demonstrated need; add utility links, badges or promotional bars by default; create app-like bottom navigation.

### 3.2 Hero

**Purpose:** explain the offer and let the buyer choose a starting route.

**Layout:** strong product-led image with real business/human context; copy block with headline, one support sentence and two route actions.

**Hierarchy:** headline → support sentence → Route A → Route B → image detail.

**Spacing:** generous separation from header and next section; no dense card cluster inside the Hero.

**Responsive:** desktop may use split layout; mobile stacks copy and image with both routes visible early. Crop image intentionally for mobile.

**States:** standard button/link states only; no auto-changing Hero.

**Do:** make product physical and recognizable; keep the first screen commercial, human and easy.

**Don't:** use an institutional manifesto, consultant language, unsupported operational claims, rotating slides or three equal CTAs.

### 3.3 Buttons and links

**Purpose:** make next steps unmistakable.

**Layout:** icon optional; label always explicit.

**Hierarchy:** primary filled with brand red; secondary outlined or neutral; contextual as text/link.

**Spacing:** minimum 44 px high; 12–16 px vertical and 20–28 px horizontal target.

**Responsive:** full-width may be used on mobile when it clarifies sequence; avoid full-width for every control.

**States:** default, hover, focus, pressed, disabled, loading.

**Do:** use consistent verbs: Explorar, Contar, Cotizar, Enviar.

**Don't:** mix synonyms across sections, use vague “Conocer más” when the destination can be named, or place multiple red buttons together.

### 3.4 Category cards

**Purpose:** move buyers quickly into a familiar product family.

**Layout:** image, category name and optional directional affordance. No paragraph required.

**Hierarchy:** product image → category label → action cue.

**Spacing:** consistent image ratios and card padding; preserve breathing room between cards.

**Responsive:** 3–6 across desktop depending on width; two-column grid or clear vertical list on mobile.

**States:** default, hover, focus, unavailable/hidden only if driven by real data.

**Do:** use representative product photography and real taxonomy.

**Don't:** show price, SKU, badges, filters and descriptions in Home cards; use a mandatory horizontal carousel.

### 3.5 Solution cards

**Purpose:** help buyers recognize a business situation when they do not begin with a product.

**Layout:** contextual image, occasion title, one-line explanation, project CTA.

**Hierarchy:** situation → brief benefit/need → action.

**Spacing:** larger visual area than copy area.

**Responsive:** maximum three or four visible; stack on mobile with concise copy.

**States:** default, hover, focus.

**Do:** frame events, onboarding/collaborators and corporate gifts as needs.

**Don't:** imply logistics, kitting, fulfillment, samples or guaranteed delivery without evidence.

### 3.6 Process steps

**Purpose:** reduce uncertainty about what happens next.

**Layout:** numbered or icon-led sequence of three or four steps.

**Hierarchy:** verb → one short sentence → condition/confirmation only when necessary.

**Spacing:** equal rhythm; visible sequence without decorative connectors that break responsively.

**Responsive:** horizontal on desktop when readable; vertical on mobile.

**States:** static; optional link on the final step.

**Do:** distinguish request, review/confirmation and next commercial step.

**Don't:** imply that submitting a request equals a quote, order, production or sale.

### 3.7 Trust signals

**Purpose:** answer a real objection at the moment it occurs.

**Layout:** small set of facts, policies or human/contact signals; placement may vary by journey.

**Hierarchy:** evidence → meaning; never claim → decorative icon.

**Spacing:** compact but separate from promotional copy.

**Responsive:** stack cleanly; remove low-value repetition on mobile.

**States:** links to evidence/policy where applicable.

**Do:** use verified identity, contact, privacy, pricing conditions and advisor review where true.

**Don't:** use invented metrics, unauthorised client logos, generic shields or “guaranteed” badges.

### 3.8 FAQ

**Purpose:** remove final friction, not teach the entire business.

**Layout:** accordion with three to six prioritized questions.

**Hierarchy:** question first; concise answer; contextual link when necessary.

**Spacing:** generous row height and visible focus.

**Responsive:** same pattern across viewports; one item open at a time is preferred on mobile.

**States:** closed, open, hover, focus.

**Do:** answer quantity, personalization, pricing or process only with approved facts.

**Don't:** preload every answer, bury legal terms or repeat Home copy.

### 3.9 Final CTA

**Purpose:** give undecided or now-convinced users the same two starting paths.

**Layout:** short heading, optional one-line support and two route actions.

**Hierarchy:** one dominant action based on context; alternative remains clear.

**Spacing:** isolated from footer; no extra cards or trust clutter.

**Responsive:** stacked actions on mobile with clear order.

**States:** standard action states.

**Do:** repeat Explorar catálogo and Contar mi proyecto.

**Don't:** add newsletter, WhatsApp, phone, chat and contact as equal competing CTAs.

### 3.10 Footer

**Purpose:** secondary navigation, legal identity and access to policies/contact.

**Layout:** logo/name, concise links, contact/legal groups.

**Hierarchy:** identity → essential links → legal.

**Spacing:** compact and readable; low visual dominance.

**Responsive:** stacked groups or simple accordion; no dense sitemap.

**States:** link hover/focus.

**Do:** show only verified legal and contact information.

**Don't:** invent founding year, certifications, coverage or rights language before legal review.

### 3.11 Search

**Purpose:** support buyers who already know a product, category or term.

**Layout:** visible entry on catalogue-led surfaces; optional compact access in Header/Home when technically supported.

**Hierarchy:** input → suggestions/results → contextual help.

**Spacing:** large enough for touch and readable queries.

**Responsive:** dedicated search surface may be preferable to a cramped header input on mobile.

**States:** empty, typing, loading, results, no results, error.

**Do:** offer categories and useful recovery when no result exists.

**Don't:** promise intelligent/AI search, show fabricated suggestions or hide the project route after no results.

### 3.12 Mobile menu

**Purpose:** expose essential navigation without turning the site into an app.

**Layout:** sheet or full-height panel with clear close control, primary links and one action.

**Hierarchy:** product route, project route, essential pages, legal/contact last.

**Spacing:** 44 px minimum targets and strong vertical rhythm.

**Responsive:** mobile/tablet only; close after navigation and restore focus correctly.

**States:** closed, open, focus trapped, current page.

**Do:** keep labels direct and count low.

**Don't:** use bottom navigation, nested accordions without need, social feeds or promotional widgets.

## 4. Desktop composition rules

1. Preserve the seven-zone Home architecture.
2. Keep Hero routes visible without scrolling at 1440 × 900 target QA.
3. Use image-led sections, not rows of copy-heavy cards.
4. Limit category and solution counts to what can be scanned in seconds.
5. Alternate composition, not component style, to create rhythm.
6. Keep process and trust visually lighter than product/solution discovery.
7. Prevent the footer from becoming a second navigation page.

## 5. Mobile composition rules

1. Prioritize Hero, two routes, categories, solutions, process, trust and CTA in that order.
2. Edit copy before shrinking typography.
3. Keep one primary visual idea per viewport.
4. Prefer vertical flow to carousels and horizontal scrolling.
5. Preserve context in image crops; do not leave only a decorative fragment.
6. Use progressive disclosure for FAQ and secondary details.
7. Test one-handed reach for menus and primary actions without adding app navigation.
8. Keep form fields and validation legible; avoid modal-heavy flows.

## 6. Photography direction

### Content mix

- Hero: one strong scene combining a real promotional product with a credible business/human occasion.
- Categories: consistent product-first images with clean composition.
- Solutions: contextual scenes showing occasion and audience, not literal corporate posing.
- Process: simple details, materials or hands in context; avoid manufacturing claims.
- Trust: real people or real service touchpoints only when verified and consented.

### Art direction

- Natural or soft directional light.
- Warm-neutral grading compatible with ivory surfaces.
- Controlled use of red through product/customization accents, not forced props.
- Materials and personalization should remain legible.
- Backgrounds support silhouette and contrast.
- Composition must reserve safe areas for responsive crop, not text baked into photography.

### Asset requirements

- Web usage rights and documented source.
- High-resolution master plus approved responsive crops.
- AVIF/WebP delivery where supported.
- Alt text describing product and context, not marketing copy.
- No third-party marks without authorization.

## 7. Content density limits

- Hero: one headline, one support sentence, two route actions.
- Category card: one label; optional short qualifier only if essential.
- Solution card: title plus one short sentence.
- Process step: verb plus one sentence.
- Trust block: three to five verified signals maximum.
- FAQ: three to six questions.
- Final CTA: one heading, one support sentence, two actions.

If content exceeds these limits, it moves to a destination page or is removed; it is not solved by smaller text.

## 8. Required states

Every interactive component must define:

- default;
- hover where applicable;
- keyboard focus;
- pressed/selected;
- disabled;
- loading where asynchronous;
- success;
- empty/no results;
- recoverable error.

Messages must state what happened and what the user can do next. Do not expose internal technology or system jargon.

## 9. Build handoff checklist

- [ ] Approved proposal exports attached for desktop and mobile.
- [ ] Current logo supplied in SVG.
- [ ] Brand red sampled and contrast-tested.
- [ ] Typeface and web licensing confirmed.
- [ ] Copy and SEO review complete.
- [ ] Claims table resolved for every factual statement.
- [ ] Category taxonomy mapped to production routes.
- [ ] Route A and Route B destinations confirmed.
- [ ] CRM request contract confirmed for Route B.
- [ ] Price, MOQ, stock and personalization states specified.
- [ ] Photography selected with usage rights.
- [ ] Legal identity, privacy, terms and contact approved.
- [ ] Analytics events mapped without implementing unnecessary tracking.
- [ ] Desktop/mobile QA matrix agreed.
- [ ] WCAG AA checks included in acceptance criteria.
- [ ] Performance budget and responsive image plan defined.

## 10. Acceptance criteria for Design System V1

The system is ready for Build preparation when:

1. the current logo and approved verbal direction are preserved;
2. the Home follows the seven locked zones;
3. both routes are obvious in Hero and final CTA;
4. the interface is image-led and low-density;
5. product and human/business context coexist without sentimentality;
6. red is an action color, not a visual flood;
7. desktop and mobile rules are independently specified;
8. every claim is approved, verified or removed;
9. components include responsive and interaction states;
10. no new business capability is implied by design.

**PE DESIGN SYSTEM V1 — READY FOR COPY + BUILD PREPARATION**
