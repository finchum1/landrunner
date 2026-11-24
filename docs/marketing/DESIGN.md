> **Update 2026-11-24:** the "Section Log" chart (the SVG well-log strip and its phone strip) was removed at Terrence's request. The site now shows real screenshots of the app (sticky, changing as you scroll on desktop; one phone-layout screenshot per stage on phones). The log-paper grid bands, ruled boxes, Big Shoulders Display + Barlow type, amber highlighter and dark/light themes below still apply; anything below about the Section Log SVG, its pattern fills and curves is historical.

---
name: JillSpoon Leasing (placeholder name)
description: A lease project drawn as a well log, on pale log paper with ink rules and one amber highlighter.
colors:
  log-paper: "#eff4f0"
  log-paper-2: "#e2eae4"
  log-paper-3: "#d4dfd7"
  ink: "#12201f"
  ink-2: "#3d4d4b"
  ink-3: "#5b6c69"
  grid-cyan: "#2e9aa0"
  curve-red: "#c4352b"
  curve-blue: "#1d4f9e"
  curve-green: "#1c8049"
  highlighter-amber: "#f2a81d"
  highlighter-amber-hover: "#ffb92f"
  amber-deep: "#b5760b"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(2.9rem, 9vw, 6rem)"
    fontWeight: 700
    lineHeight: 0.9
  headline:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(2.4rem, 5vw, 3.8rem)"
    fontWeight: 700
    lineHeight: 0.95
  title:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "1.7rem"
    fontWeight: 700
    lineHeight: 1
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 600
    letterSpacing: "0.12em"
  numeral:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "1rem"
    fontWeight: 500
rounded:
  none: "0px"
spacing:
  gutter: "20px"
  gutter-wide: "32px"
  section: "80px"
  section-wide: "112px"
components:
  button-primary:
    backgroundColor: "{colors.highlighter-amber}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "8.8px 22.4px"
    height: "48px"
    typography: "{typography.title}"
  button-primary-hover:
    backgroundColor: "{colors.highlighter-amber-hover}"
  button-quiet:
    backgroundColor: "{colors.log-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "8.8px 22.4px"
    height: "48px"
  note:
    backgroundColor: "{colors.log-paper}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.none}"
    padding: "17.6px 20.8px"
---

# Design System: JillSpoon Leasing (placeholder name)

## Overview

**Creative North Star: "The Section Log"**

A lease project drawn as the document the oil patch already trusts: a well log. Pale green-grey log paper, a cyan measurement grid, ink-black 1.5px rules, boxed header cells, and curve inks in red, blue and green. Depth is net mineral acres, owners are intervals, status is the fill, and one amber highlighter marks the single action on a screen. It is light only; the scene is a desk or a truck cab in daylight.

The grid is a measurement surface, not wallpaper. It appears only on the hero field and the page-title bands (the log-paper surface). Reading text sits on flat paper or inside a boxed annotation note, so copy never fights the grid. Everything is square-cornered and ruled; type is condensed caps for structure and plain Barlow for reading, with mono for numerals.

**Key Characteristics:**
- Light-only, flat paper with ink rules; structure comes from boxes and 1.5px lines, not tints or radii.
- One accent action color (amber); red, blue, green are data inks, not UI accents.
- Condensed uppercase headings at large scale over calm 17px body.
- Status is encoded by fill pattern as well as color (hatch, dots, dashes), so the log reads without color.

## Colors

A cool pale paper with near-black teal ink, a cyan grid, three curve inks and one amber highlighter.

### Primary
- **Highlighter Amber** (#f2a81d): the primary button fill, the Request access nav cell, and text selection. Hover lifts to #ffb92f. Its deep partner (#b5760b) is used only inside the negotiating-status hatch in the log SVG.

### Secondary
- **Curve Blue** (#1d4f9e): focus outline (3px, 3px offset) and the offered/contacted status inks in the log.
- **Curve Green** (#1c8049): leased fill and the leased curve.
- **Curve Red** (#c4352b): declined status, form error text and border, input caret.

### Neutral
- **Log Paper** (#eff4f0): body and note background.
- **Log Paper 2 / 3** (#e2eae4, #d4dfd7): alternate section bands (at 80% opacity), nav hover cell, scrollbar track.
- **Ink** (#12201f): text, all rules, scrollbar thumb, exhibit caption bar.
- **Ink 2 / Ink 3** (#3d4d4b, #5b6c69): secondary copy; labels.
- **Grid Cyan** (#2e9aa0): drawn only as the grid, at 17% (20px minor) and 36% (100px major) alpha.

### Named Rules
**The One Highlighter Rule.** Amber marks the one thing to do on a surface (request access). Curve inks never become buttons or links.
**The Grid Stays Home Rule.** The cyan grid lives only on the hero field and page-title bands. Body copy goes on flat paper or in a boxed note.

## Typography

**Display Font:** Barlow Condensed (600/700, with Arial Narrow)
**Body Font:** Barlow (400/500/600, with system-ui)
**Label/Mono Font:** JetBrains Mono (400/500) for depth numerals, tabular figures

**Character:** Survey-sheet condensed caps for every heading and control, with a humanist grotesque for reading.

### Hierarchy
- **Display** (700, clamp(2.9rem, 9vw, 6rem), 0.9, uppercase): home hero headline; page titles use clamp(3rem, 8vw, 5.6rem).
- **Headline** (700, clamp(2.4rem, 5vw, 3.8rem), 0.95, uppercase): section headings, balanced wrap.
- **Title** (700, 1.7rem, 1, uppercase): sub-feature headings; buttons use 1.15rem at 0.06em tracking.
- **Body** (400, 1.0625rem to 1.12rem, 1.55): reading copy in ink-2, capped at 30 to 40rem.
- **Label** (600, 0.78rem, 0.12em, uppercase, ink-3): form field names, instructional hints, the "sample data" tag.
- **Numerals** (JetBrains Mono, tabular-nums): depth scale and readouts.

### Named Rules
**The Caps Are Structural Rule.** Condensed uppercase is for headings, buttons, nav cells and labels; running copy is never uppercase.

## Layout

A 88rem max container with 20px (32px from sm) side gutters. Home and feature sections use 80px vertical padding, 112px from lg. Content sits on a 12-column grid at lg (8/4 and 6/6 splits for exhibit-plus-caption). The nav is a sticky ruled strip whose links are full-height cells separated by 1.5px rules. Section bands alternate flat paper and paper-2. Smooth scroll with 5.5rem scroll padding under the sticky nav. The hero is a scrollytelling log: headline and request button left, boxed log over an interval strip right, advancing through import, call, offer, lease, report; stages are also tappable.

## Elevation & Depth

Flat with ink rules. Depth is the box edge, not blur. The only shadows are soft downward ones: buttons (0 8px 16px -8px at 50% ink, lifting to 12px/20px on hover and pressing to 2px/4px) and exhibit figures (0 10px 24px -12px). Both are ambient and offset-free; no hard offset shadows. Hover also moves buttons -2px, active +1px; reduced-motion removes it.

### Named Rules
**The Ruled Edge Rule.** A surface is separated by a 1.5px ink rule first; a soft shadow is only added to clickable buttons and screenshot exhibits.

## Shapes

Square everywhere: radius 0, border 1.5px solid ink (the shared rule). Boxed cells for headers, notes, nav items and form fields. Status fills are SVG patterns (diagonal hatch, dots, dashes, crosshatch, vertical ticks) with solid green for leased.

## Components

### Buttons
- **Shape:** square, 1.5px ink border, min-height 3rem, padding 0.55rem 1.4rem, condensed bold caps.
- **Primary:** amber fill, ink text; hover #ffb92f with lift.
- **Quiet:** paper fill, ink text, same border and lift; the secondary action beside primary.
- **Focus:** 3px blue outline, 3px offset.

### Cards / Containers
- **Note:** paper background, 1.5px ink border, 1.1rem 1.3rem padding; holds copy set over the grid.
- **Cell:** paper with ink border; boxed log-heading cell.
- **Exhibit:** a screenshot figure with an ink caption bar (condensed caps title left, "sample data" right in paper at 60%) above the image.

### Inputs / Fields
Boxed paper fields under a condensed-caps label; sans, sentence case text at 1.05rem; red caret. Errors are a red-bordered white box with red text. Success state is a white ruled panel with a condensed headline.

### Navigation
Sticky, paper at 95% with a bottom rule. Wordmark left; condensed caps link cells with left rules, hover paper-3; the last cell is amber ("Request access", shortened to "Access" on small screens).

### Section Log (signature)
An SVG well log: depth in net mineral acres (mono numerals), owner intervals with status fills and a fill key, and two curves (reached, leased) that climb as the stage advances (path transitions 900ms, fades 650ms, ease-out expo-style, none under reduced motion). Starts at zero with a sample-data label.

## Do's and Don'ts

### Do:
- **Do** use radius 0 and the 1.5px ink rule for every box.
- **Do** keep the grid to the hero and page-title bands, and put reading text on flat paper or a note.
- **Do** make status legible without color, using a pattern fill plus a key.
- **Do** label demo content "sample data".
- **Do** use amber for exactly one primary action per view.

### Don't:
- **Don't** go dark or add a dashboard-hero look; the world is daylight paper.
- **Don't** use rounded corners or colored accent borders.
- **Don't** use curve red, blue or green as button or link fills.
- **Don't** set running copy in uppercase or condensed type.
