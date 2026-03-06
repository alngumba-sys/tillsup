Implement the following when a client clicks View Pricing:

1. Pricing Page UI Design (View Pricing Screen)
* Layout: Use a responsive 3-column card-based design (one card per tier: Basic, Professional, Enterprise). Center-aligned on desktop; stack vertically on mobile.
    * Highlight Professional as "Most Popular" with a badge.
    * Each card includes: Tier name, price (dynamic based on country/IP), key features (bullet list), branch limit, AI access indicator, and CTA button ("Get Started" or "Start 14-Day Trial").
    * Add a toggle/switch at the top for Monthly/Annual billing (apply 20% discount for annual, e.g.).
    * Include a "Compare All Features" accordion or modal below the cards for a detailed table view.
* Dynamic Pricing Display:
    * Detect user's country via IP geolocation (frontend: use libraries like ipapi.co or backend API).
    * Default to Kenya (Ksh) if IP undetected; allow manual country selector dropdown (e.g., Kenya, Ghana, Ethiopia) that updates prices live.
    * Prices are placeholders—admin sets actual values (see Admin section below). Examples:
        * Basic: Ksh 999/mo (Kenya), GH¢ 150/mo (Ghana), ETB 500/mo (Ethiopia).
        * Professional: Ksh 2,499/mo, GH¢ 350/mo, ETB 1,200/mo.
        * Enterprise: Custom quote (button links to contact form).
* Trial Banner: At the top, a prominent banner: "Start a 14-Day Free Trial – Access Everything, No Credit Card Required" with a signup CTA. During trial, users get Enterprise-level access (all features, unlimited branches) that downgrades post-trial unless upgraded.
* Figma Prototype Notes:
    * Wire up CTAs to a signup flow: Select tier → Country confirmation → Account creation → Dashboard redirect.
    * Use variables for prices/currencies to simulate dynamic changes.
    * Add hover states for cards and tooltips for feature explanations.
2. Tier Definitions & Feature Gating
* Basic Tier:
    * Branch Limit: Up to 2 branches (locations/stores per business account).
    * Features: Limited to core essentials only. No AI features.
        * Suggested Limited Feature List (based on typical business SaaS like yours—adjust as needed):
            * Basic invoicing & sales tracking (up to 100 transactions/mo).
            * Simple customer management (contact list, no segmentation).
            * Inventory tracking (manual entry, no auto-reorder).
            * Basic reporting (daily/weekly sales summaries, no advanced analytics).
            * Payment integration (1 gateway, e.g., M-Pesa only).
            * User roles (owner + 1 staff account).
            * Mobile app access (view-only, no editing).
    * AI: None (e.g., no predictive sales forecasts, automated insights, or chat support).
* Professional Tier:
    * Branch Limit: Up to 5 branches.
    * Features: All Basic features + additional mid-level ones.
        * Suggested Additions:
            * Advanced invoicing (custom templates, recurring billing).
            * Customer CRM (segmentation, email/SMS integration).
            * Inventory management (auto-alerts, barcode support).
            * Detailed reporting (monthly trends, export to PDF/Excel).
            * Multiple payment gateways (e.g., M-Pesa, Visa, bank transfers).
            * User roles (owner + up to 5 staff, basic permissions).
            * Mobile app (full editing, push notifications).
    * AI: Limited (e.g., basic AI-driven sales predictions and automated receipt generation; cap at 50 AI uses/mo).
* Enterprise Tier:
    * Branch Limit: 5+ (unlimited, with custom scaling).
    * Features: All Professional features + full suite.
        * Suggested Additions:
            * Enterprise CRM (loyalty programs, advanced analytics).
            * Multi-location inventory sync (real-time across branches).
            * Custom reporting dashboards (API integrations, real-time data).
            * Unlimited payment gateways & integrations (e.g., ERP/accounting software).
            * Advanced user management (unlimited staff, role-based access control).
            * Priority support (dedicated account manager, 24/7 chat).
            * Custom branding & white-labeling.
    * AI: Full access (e.g., advanced AI analytics, chatbots for customer service, predictive inventory, unlimited uses).
* Implementation Notes:
    * During 14-day trial: Temporarily assign Enterprise access; auto-downgrade to Basic if not subscribed (notify via email/dashboard).
    * Branch Enforcement: In dashboard, disable "Add Branch" button if limit reached; prompt upgrade modal.

For the Admin do the following

1. Admin Panel Enhancements
* Country-Specific Pricing Management:
    * Add a new "Pricing Admin" section (tab or page) in the Admin dashboard.
    * UI: Table or form where admin selects a country (dropdown: Kenya, Ghana, Ethiopia, etc.) and sets prices for each tier (fields for Monthly/Annual, currency auto-detected/e.g., Ksh, GH¢, ETB).
        * Example Form:
            * Country: [Dropdown]
            * Basic Monthly: [Input] [Currency]
            * Professional Annual: [Input] [Currency] (auto-apply discount if needed)
            * Enterprise: "Custom" or fixed price.
    * Buttons: "Apply Changes" (updates live), "Preview" (shows user-facing pricing page simulation).
    * Tie to IP: On frontend load, query IP → map to country → fetch prices from backend DB.
* Figma Design for Admin:
    * Use a form component with validation (e.g., required fields, currency formatting).
    * Prototype: Select country → Prices auto-populate/edit → Save → Success toast.
    * Dev Notes: Store in DB as JSON per country; fallback to default if no IP match.

Overall Implementation Guidance
* User Flow: Visitor lands on Pricing → IP detects country/prices → Selects tier/trial → Signs up → Dashboard shows tier limits → Admin can override via backend.
* Edge Cases: Handle IP spoofing (manual selector override), multi-country businesses (default to primary country), trial expiration (email reminders at day 7/13).
* Testing: Prototype in Figma for signup/upgrade flows; ensure responsive design.
* Rationale for Fundability/Impact: This tiered model supports scalability for small-to-large businesses in emerging markets like Ethiopia, aligning with needs for affordable tools while monetizing advanced/AI features.
