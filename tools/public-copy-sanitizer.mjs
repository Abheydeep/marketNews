export function stripPublicJargon(value) {
  return String(value ?? "")
    .replace(/\brisk-off assets?\b/gi, "safe-haven assets")
    .replace(/\brisk-on assets?\b/gi, "growth assets")
    .replace(/\brisk-off\b/gi, "defensive")
    .replace(/\brisk-on\b/gi, "constructive")
    .replace(/\bVWAP\b/g, "session average")
    .replace(/\bopening range\b/gi, "first-hour range")
    .replace(/\brisk appetite\b/gi, "willingness to take risk")
    .replace(/\bsector breadth validates\b/gi, "sector participation confirms")
    .replace(/\bsector breadth\b/gi, "sector participation")
    .replace(/\badvance-decline\b/gi, "market participation")
    .replace(/\bbreadth\b/gi, "market participation")
    .replace(/\bstructural heft\b/gi, "staying power")
    .replace(/\baccumulation or distribution\b/gi, "sustained buying or selling");
}

export function sanitizePublicHtml(value) {
  return String(value ?? "").replace(
    /(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<[^>]+>)|([^<]+)/gi,
    (match, protectedMarkup, visibleText) => protectedMarkup || stripPublicJargon(visibleText)
  ).replace(/<button(?![^>]*\btype=)/gi, '<button type="button"');
}
