// ------------------------------------------------------------------
//  Carne & Gusto — client content. EVERYTHING here is PLACEHOLDER.
//  Replace with the real details before launch.
// ------------------------------------------------------------------
export const CONFIG = {
  brand: 'Carne & Gusto',
  currency: '₹',
  phone: '+00 00000 00000',
  whatsapp: '0000000000', // digits only, with country code e.g. 919876543210
  address: ['Shop No. 00, Your Street', 'Your Area, Your City 000000'],
  mapsQuery: 'Carne & Gusto Your City',
  hours: [
    ['Mon – Sat', '6:00 am – 9:30 pm'],
    ['Sunday', '6:00 am – 1:00 pm & 4:00 pm – 9:00 pm'],
  ],
  instagram: '@carneandgusto',

  // Today's rate board. Rates change daily — update here (or wire to a sheet later).
  rates: [
    { name: 'Live Bird', note: 'Pick your own, weighed live', price: 150, unit: 'kg' },
    { name: 'Dressed · With Skin', note: 'Cleaned, ready for the pot', price: 230, unit: 'kg' },
    { name: 'Dressed · Skinless', note: 'Lean & clean', price: 250, unit: 'kg' },
    { name: 'Curry Cut', note: 'Medium pieces, bone-in', price: 240, unit: 'kg' },
    { name: 'Boneless Breast', note: 'Trimmed, cooking-ready', price: 340, unit: 'kg' },
    { name: 'Leg / Drumsticks', note: 'Skin on or off', price: 280, unit: 'kg' },
    { name: 'Wings', note: 'Whole or jointed', price: 220, unit: 'kg' },
    { name: 'Mince', note: 'Ground fresh while you wait', price: 300, unit: 'kg' },
  ],
};

export const waLink = (text = 'Hi Carne & Gusto! I would like to place an order.') =>
  `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
export const mapsLink = () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONFIG.mapsQuery)}`;
export const money = (n) => `${CONFIG.currency}${n}`;
