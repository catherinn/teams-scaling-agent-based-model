// Feedback goes to a Google Form owned by the author. The site has no backend, so the
// form is submitted directly to Google Forms. Leave `action` empty to hide the section.
export const FEEDBACK = {
  action: "",
  fields: { useful: "", comment: "", role: "", email: "" } as Record<string, string>,
};

export function setupFeedback() {
  const section = document.getElementById("feedback");
  const form = document.getElementById("feedback-form") as HTMLFormElement | null;
  const status = document.getElementById("feedback-status");
  if (!section || !form || !status || !FEEDBACK.action) return;
  section.hidden = false;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const body = new URLSearchParams();
    for (const [name, entry] of Object.entries(FEEDBACK.fields)) {
      const v = String(data.get(name) ?? "").trim();
      if (v && entry) body.set(entry, v);
    }
    // Which scenario the person was looking at, so feedback has context.
    if (FEEDBACK.fields.scenario) body.set(FEEDBACK.fields.scenario, location.search || "(defaults)");
    const button = form.querySelector("button")!;
    button.disabled = true;
    status.textContent = "Sending…";
    try {
      // Google Forms does not allow reading the response cross-origin; a sent request counts as delivered.
      await fetch(FEEDBACK.action, { method: "POST", mode: "no-cors", body });
      form.reset();
      status.textContent = "Thank you! Your feedback was sent.";
    } catch {
      status.textContent = "Sorry, that didn't go through. Please try again later.";
    } finally {
      button.disabled = false;
    }
  });
}
