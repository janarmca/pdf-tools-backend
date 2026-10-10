/* Site settings — edit here (these values are public by design; secrets stay on the server). */
window.MAT_CONFIG = {
  SUPABASE_URL: 'https://zasarkaysjkclzwvdduu.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_N6LTr070Y6IXwHMjH9aeUQ_-xDo8ARE',
  BACKEND_URL: 'https://all-in-one-tools-22743935825.asia-south1.run.app',
  FEE_ON: false,                    // chat fee is OFF for now (everything free). Must match the DB switch: update mat_settings set value='on' where key='chat_fee';
  FEE_RS: 50,                       // chat unlock fee (must match MATRIMONY_FEE_PAISE on the server: 5000 paise)
  SITE_URL: 'https://pdftoolsindia.com/matrimony/',
  SUPPORT_EMAIL: 'support@pdftoolsindia.com',
  SUPPORT_NAME: 'தியாகராஜன்',
  SUPPORT_NAME_EN: 'Thiyagarajan',
  SUPPORT_PHONE: '9698777639',      // shown on the Contact page + footer
  SUPPORT_WHATSAPP: '919698777639'  // wa.me number (country code first); empty = hide the WhatsApp button
};
