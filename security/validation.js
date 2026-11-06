/* Client-side validation is for safe handling, not a substitute for server security. */
window.SafeInput = {
  text(value, max = 120) {
    if (typeof value !== "string") return "";
    return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
  },
  requiredText(value, label, max = 120) {
    const cleaned = this.text(value, max);
    if (!cleaned) throw new Error(label + " is required.");
    return cleaned;
  },
  integer(value, min, max, label) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max) throw new Error(label + " must be between " + min + " and " + max + ".");
    return n;
  },
  safeDate(value) {
    const d = new Date(value);
    if (!value || Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }
};