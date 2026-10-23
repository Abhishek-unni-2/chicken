# Carne & Gusto — website

**Main site:** `site-3-stall/` (chicken stall — live birds, dressed chicken, fresh cuts).
`site-1-reveal/` and `site-2-cuts/` are earlier roast-chicken concepts and are superseded.

## Run locally
    cd /home/abhishek/Desktop/frelance/chicken
    python3 -m http.server 8765
    open http://localhost:8765/site-3-stall/

(ES modules need a server — double-clicking index.html won't work. For hosting, upload the whole folder
to Netlify / Vercel / any static host; keep `shared/` next to `site-3-stall/`.)

## Edit content
`site-3-stall/config.js` — phone, WhatsApp number, address, hours, today's rates. All values are PLACEHOLDERS.

## Real chicken photos
Drop transparent-background WebP or PNG (WebP preferred, ~760px wide) into `site-3-stall/assets/`:
`hen.png`, `dressed.png`, `cuts.png`, `bulk.png` — they automatically replace the line-art icons on the flip cards.
