// ------------------------------------------------------------------
//  Carne & Gusto — client content. EVERYTHING here is PLACEHOLDER:
//  replace with the real details before launch. Both sites read this file.
// ------------------------------------------------------------------
export const CONFIG = {
  brand: 'Carne & Gusto',
  currency: '₹',
  phone: '+00 00000 00000',
  whatsapp: '0000000000', // digits only, with country code, e.g. 919876543210
  address: ['Shop No. 00, Your Street', 'Your Area, Your City 000000'],
  mapsQuery: 'Carne & Gusto Your City',
  hours: [
    ['Mon – Fri', '8:00 am – 10:00 pm'],
    ['Sat – Sun', '8:00 am – 11:00 pm'],
  ],
  instagram: '@carneandgusto',

  menu: {
    ready: [
      { name: 'Whole Roast Chicken', note: 'Herb & garlic rub, slow-roasted on the spit', price: 399, unit: 'bird', tag: 'Signature' },
      { name: 'Half Roast Chicken', note: 'Leg, wing and breast, straight off the fire', price: 229, unit: 'half' },
      { name: 'Grilled Leg Quarter', note: 'Charred edges, juicy centre', price: 149, unit: 'piece' },
      { name: 'Crispy Wings', note: 'Double-crisp, house spice dust', price: 179, unit: '6 pcs' },
      { name: 'Chicken Tenders', note: 'Hand-cut, golden, dip-ready', price: 169, unit: '5 pcs' },
      { name: 'Family Feast', note: 'Whole bird + two sides + dips', price: 549, unit: 'serves 3–4', tag: 'Value' },
    ],
    fresh: [
      { name: 'Whole Chicken', note: 'Cleaned & skinned to order', price: 230, unit: 'kg' },
      { name: 'Curry Cut', note: 'Medium pieces, bone-in', price: 240, unit: 'kg' },
      { name: 'Boneless Breast', note: 'Trimmed and ready to cook', price: 340, unit: 'kg', tag: 'Lean' },
      { name: 'Drumsticks', note: 'Skin on or off', price: 280, unit: 'kg' },
      { name: 'Wings', note: 'Whole or jointed', price: 220, unit: 'kg' },
      { name: 'Mince', note: 'Ground fresh while you wait', price: 300, unit: 'kg' },
    ],
  },
};

export const waLink = (text = 'Hi Carne & Gusto! I would like to place an order.') =>
  `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
export const mapsLink = () => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONFIG.mapsQuery)}`;
export const money = (n) => `${CONFIG.currency}${n}`;

/** Fill [data-cfg] elements and render menu lists into [data-menu="ready|fresh"] using a template fn. */
export function hydrate(renderItem) {
  document.querySelectorAll('[data-cfg]').forEach((el) => {
    const k = el.dataset.cfg;
    if (k === 'phone') { el.textContent = CONFIG.phone; if (el.tagName === 'A') el.href = `tel:${CONFIG.phone.replace(/\s/g, '')}`; }
    else if (k === 'address') el.innerHTML = CONFIG.address.join('<br>');
    else if (k === 'hours') el.innerHTML = CONFIG.hours.map(([d, h]) => `<span>${d}</span><b>${h}</b>`).join('');
    else if (k === 'wa') el.href = waLink();
    else if (k === 'maps') el.href = mapsLink();
    else if (k === 'instagram') el.textContent = CONFIG.instagram;
  });
  document.querySelectorAll('[data-menu]').forEach((el) => {
    el.innerHTML = CONFIG.menu[el.dataset.menu].map((it, i) => renderItem(it, i)).join('');
  });
}
