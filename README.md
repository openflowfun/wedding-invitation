# Krishal & Jayakshi — Wedding Invitation

A static site: `index.html` + `css/style.css` + `js/main.js`. No build step — open `index.html` directly, or host it anywhere (GitHub Pages, Netlify, Vercel, Cloudflare Pages).

---

## ⚠️ One setup step before you share the link

RSVPs are saved to a Google Sheet, and that needs about five minutes of setup. **Until you do this, the RSVP form will show "RSVP is not connected yet"** and nothing will be recorded.

### 1. Create the sheet

1. Go to [sheets.new](https://sheets.new) and name the spreadsheet something like *Krishal & Jayakshi RSVPs*.

Don't add headers or columns — the script creates them on the first RSVP.

### 2. Add the script

2. In that sheet: **Extensions → Apps Script**.
3. Delete whatever is in the editor, then paste in the entire contents of [google-apps-script.gs](google-apps-script.gs).
4. Click **Save** (💾).

### 3. Deploy it

5. Click **Deploy → New deployment**.
6. Click the gear icon next to "Select type" and choose **Web app**.
7. Set:
   - **Execute as:** `Me`
   - **Who has access:** `Anyone` ← must be *Anyone*, not "Anyone with Google account"
8. Click **Deploy**, then **Authorize access** and approve the prompts. (Google will warn the app isn't verified — expected for your own script. Choose *Advanced → Go to [project name]*.)
9. Copy the **Web app URL**. It ends in `/exec`.

### 4. Connect the website

10. Open [js/main.js](js/main.js) and paste that URL into line 7:

```js
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfy…/exec';
```

Submit a test RSVP — a new row should appear in the sheet within a second or two.

> **If you ever edit the Apps Script**, you must **Deploy → Manage deployments → ✏️ → Version: New version → Deploy** for the change to go live. Saving alone does not update the deployed URL.

---

## Dashboard

Menu → **Dashboard**, then enter the passcode. It shows counts (responses / attending / not attending / total guests), the full response table, filters for **Attending** and **Not Attending**, and a CSV export that respects the current filter.

The passcode is `KJ1712`. To change it, edit `SECRET_KEY` in [google-apps-script.gs](google-apps-script.gs) and redeploy (**Deploy → Manage deployments → ✏️ → Version: New version**). Nothing in the website needs changing — see below for why.

### How the passcode is handled

The passcode is **not stored anywhere in this website**. When you type it, the site sends it to your Apps Script, which holds the real one and decides whether to answer. Someone reading the page source finds the address of your script but no working key.

That is a meaningful safeguard, but be clear about its limit: **it is a shared secret, not a login.** Anyone you give the passcode to can read every response, and anyone who obtains it — forwarded message, shoulder-surf, guessing — can too, from anywhere. There is no per-person access and no way to revoke one person without changing it for everybody.

`KJ1712` is also short and derivable from the invitation itself (initials plus 17·12), and the endpoint has no attempt limiting, so it would not withstand someone deliberately guessing. That is fine if the dashboard is a convenience among people who'd have the guest list anyway; swap `SECRET_KEY` for something longer if it ever needs to resist a stranger who has found the endpoint in the page source.

If that ever feels too loose, the airtight alternative is to stop using the site's dashboard and read the responses in Google Sheets directly, where Google's own account permissions apply. The sheet is always the authoritative copy either way.

Also worth avoiding: **don't set the sheet's sharing to "Anyone with the link"** — the guest list is only as private as the sheet is.

### What gets recorded

Every response is stored — both attendees and non-attendees — as one row: `Timestamp | Name | Attending (Yes/No) | Guests | Message`. Declines are recorded with 0 guests.

---

## Countdown, music and the opening veil

**Countdown** — counts to `WEDDING_DATE` at the top of [js/main.js](js/main.js). It's currently set to **17 Dec 2026, 7:00 pm**:

```js
const WEDDING_DATE = new Date(2026, 11, 17, 19, 0, 0);
//                              ^year ^month(0-based, 11=Dec) ^day ^hour ^min
```

Change the hour if the celebration starts at a different time — the **Add to Calendar** button builds its Google Calendar event from this same value (assuming a 5-hour event), so both stay in step automatically. On the day itself the countdown stops at zero and the message below it changes.

**Music** — drop an MP3 named exactly `music.mp3` into the `audio/` folder. The player is already wired: the button appears in the bottom-right corner only once a track loads, and stays hidden if there isn't one, so guests never see a broken control. It starts at 35% volume, loops, and begins when a guest taps *Open Invitation* — browsers only allow sound to start after a real tap.

> Use music you have the right to use. Popular songs are copyrighted; a royalty-free instrumental is the safe choice for a link you're sending widely.

**Opening veil** — the curtain screen with the monogram and the *Open Invitation* button. It only appears if JavaScript is running and the visitor hasn't asked for reduced motion; otherwise the invitation is simply open already, so nobody gets stuck behind a curtain that can't lift.

---

## The venue map

The **Venue** section embeds a Google map. It needs no API key and costs nothing.

The pin is placed by **coordinates**, not by searching the hotel's name:

```
6.8475291, 79.9944897
```

These came from the couple's own Google Maps link for the venue, so they are authoritative.

Coordinates matter here. A name search doesn't reliably render a marker — during testing the map sometimes drew Homagama with nothing pinned on it, which is worse than no map. Coordinates always drop a pin exactly where told.

**To move the pin**, change the numbers in two places in [index.html](index.html) — the `q=` on the map `<iframe>` and the `destination=` on the Get Directions button. Keep them identical, or the map and the directions will send guests to different places.

The easiest way to get exact coordinates: open Google Maps, right-click the building, and the numbers at the top of the menu are the latitude and longitude.

There's deliberately **no street address printed** on the site. Sources disagreed on the road name (*Jaya Mawatha* vs *Pinketha Road*), so rather than print something possibly wrong, the site shows the venue name and a precise pin. Add the address to the Venue section if you want it shown — the pin is the part guests actually navigate by.

---

## Photos

Live photos are in `images/`, named by scene (`couple-beach.jpg`, `couple-hills.jpg`, …). The untouched WhatsApp originals are kept in `images/originals/` in case you want to recrop anything.

- **Hero portrait:** `images/couple-uniform.jpg`, shown in an arched frame. Swap the `src` in the `.couple-photo` block in [index.html](index.html).
- **Cinematic band:** `images/couple-mountains.jpg`, the full-width photo with the quote over it.
- **Gallery mosaic:** seven tiles in `<section class="gallery">`.

### Changing the gallery

Each tile carries a size class: `big` (2×2), `tall` (1×2), `wide` (2×1), or none (1×1). The current mix — 1 big + 4 tall + 2 wide — tiles perfectly with no gaps on both the 4-column desktop grid and the 2-column mobile grid. If you add or remove photos, keep the total cell count a multiple of 4 to keep the mosaic flush.

The `alt` text on each image doubles as the hover caption and the lightbox caption, so write it as a caption.

Click any tile to open the lightbox — arrow keys and Esc work there.
