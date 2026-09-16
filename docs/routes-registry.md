# CONDSTORE OS - Routes Registry

| /career | GET | internal | required | career | live | Protected Career & Applications Dashboard |
| /dashboard1 | GET | public | none | career | live | Public Career & Applications Dashboard |
| / | TBA | public | none | PUBLIC | live | Auto-detected |
| /about | TBA | public | none | PUBLIC | live | Auto-detected |
| /sitemap | GET | public | none | PUBLIC | live | Architecture Explorer status page |
| /sitemap2 | GET | public | none | PUBLIC | live | Interactive CondStore Architecture Explorer |
| /api/app/events | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/auth/email/send-verify | POST | public | none | auth | live | Resend email verification link |
| /api/auth/email/verify | GET | public | none | auth | live | Email verification token handler |
| /api/auth/google | GET | public | none | auth | live | Google OAuth initiation |
| /api/auth/google/callback | GET | public | none | auth | live | Google OAuth callback |
| /api/auth/invite | POST | internal | required | auth | live | Team invite link handler |
| /api/auth/login | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/auth/logout | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/auth/me | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/auth/signup | POST | public | none | auth | live | Email signup |
| /api/health | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/cockpit/conversations | GET | internal | requireAdmin | cockpit | live | List conversations |
| /api/cockpit/orders | GET | internal | requireAdmin | cockpit | live | List orders |
| /api/cockpit/pipeline | GET | internal | requireAdmin | cockpit | live | Pipeline |
| /api/cockpit/status | TBA | internal | required | cockpit | live | System health |
| /api/freight/simulate | POST | internal | requireAdmin | frete | live | Freight simulator |
| /api/freight/shipments | GET,POST | internal | requireAdmin | frete | live | Shipments |
| /api/whatsapp/incoming | TBA | public | none | PUBLIC | live | Twilio webhook |
| /api/webhook/stripe | TBA | public | none | PUBLIC | live | Stripe webhook |
| /cockpit | GET | internal | required | cockpit | live | Cockpit home |
| /login | GET | public | none | PUBLIC | live | Login |
| /signup | GET | public | none | PUBLIC | live | Signup |
