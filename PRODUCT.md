# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is someone who wants to play a sport in an unfamiliar area and does not know where to find an available sports facility. They use Court Finder to locate a facility for their sport.

## Product purpose

Court Finder helps people discover sports facilities that ordinary maps and directories may miss or describe inaccurately. Success means a person can search an area, find a relevant facility on the map, assess the detection, and decide where to play.

## Positioning

Court Finder finds visible sports facilities with computer vision applied to the latest satellite imagery available through its imagery provider. It turns those detections into map pins rather than relying only on manually entered place listings, which may be missing or stale.

## Operating context

People search for a location or pan an interactive map, filter detected facilities by type and confidence, inspect satellite imagery and detection details, and use the result to choose where to play. Model confidence helps people assess a detection, but it does not establish that a facility is public, open, safe, accessible, or available to use.

Authenticated contributors can confirm, reject, or mark a detection as unclear. Authorized operators can scan areas, review scan results, and submit training annotations to Roboflow.

## Capabilities and constraints

- Supported facility types are basketball courts, tennis courts, soccer or football fields, baseball fields, and track-and-field facilities.
- Mapbox provides maps, location search, and satellite imagery. The product uses the latest imagery that the provider makes available and does not promise a capture date.
- Roboflow-backed computer vision detects facilities in satellite imagery. Court Finder displays model confidence scores and supports community feedback on detections.
- Court Finder makes no accuracy guarantee or quantified accuracy claim. People must verify a location before visiting it and must not enter locations without permission.
- The web app supports map browsing, search, facility filters, confidence filters, map clustering, saved favorites on the current device, feedback, and permission-gated scan and admin workflows.
- The interface is a progressive web app and supports light and dark themes.

## Brand commitments

The product name is Court Finder. The existing logo is stored at `public/logo.webp`.

Product language should describe detections as possible facilities found from satellite imagery. It must not imply guaranteed accuracy, public access, availability, safety, or permission to enter a location.

## Evidence on hand

- `public/logo.webp` is the current product logo.
- `public/satellite-example.png` is an existing example of satellite imagery used by the product.
- `src/routes/privacy.tsx` contains the current privacy commitments.
- `src/routes/terms.tsx` states that detections are provided without warranties and that users must respect access restrictions.
- The application and database contain model confidence, community feedback, and verification status for detections.
- No verified accuracy benchmark, testimonial, customer count, usage count, case study, or press coverage is on hand. Future work must not invent these claims.

## Product principles

- Help unfamiliar visitors get from a location search to a plausible place to play with little effort.
- Find facilities that manually maintained maps and directories miss.
- Show the evidence behind a detection, including satellite context, facility type, confidence, and verification status.
- Treat every detection as a lead to verify, not a promise that the facility is available or open to the public.
- Use contributor feedback to improve detection quality without hiding uncertainty.

## Privacy requirements

- Collect only the authentication data and usage information needed to operate, maintain, improve, and secure the service.
- Do not sell personal information.
- Let people request deletion of their account and associated data, subject to legal obligations.
- Protect user accounts and do not expose permission-gated scanning or administration tools to unauthorized users.
