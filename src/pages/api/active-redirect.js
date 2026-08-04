// src/pages/api/active-redirect.js

export default async function handler(req, res) {
  try {
    // Cleanly redirect to main landing page with resolveActive flag
    // The client-side page immediately resolves the active/featured event and pops up the registration modal!
    return res.redirect(302, '/?resolveActive=true');
  } catch (error) {
    console.error("Active redirect error:", error);
    return res.redirect(302, '/?errorRedirect=true');
  }
}
