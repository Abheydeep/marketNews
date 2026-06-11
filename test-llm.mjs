import { nimCall } from "./tools/core.mjs";

async function run() {
  const systemPrompt = "You are the Market Narrative daily briefing agent for Indian retail traders.";
  const noWrap = "Output ONLY the formatted content. Do NOT write any introduction, preamble, or sign-off. Start your response directly with the first line of the format.";
  const context = "DATE: 2026-06-11\\nMARKETS: NIFTY +0.10%\\nKEY THEMES: ...\\nSETUPS: ...\\nTOP NEWS: ...";
  
  const editorialBriefing = await nimCall(
    systemPrompt,
    `${noWrap}\n\nWrite the Editorial Briefing.\nSections: [TWO-MINUTE SUMMARY], [DESK NOTE].\n\nRULES for TWO-MINUTE SUMMARY:\n- Exactly 3 paragraphs.\n- Exactly 3 stories (one story per paragraph).\n- Facts only. No opinions.\n\nRULES for DESK NOTE:\n- An editor's opinion column with a distinct point of view.\n- It can be wrong, that's fine, but it must have a strong narrative.\n- ABSOLUTELY NO trading levels (e.g. no 22,400) and NO trading calls (e.g. no "buy the dip" or "hold VWAP").\n- Focus entirely on market narrative and structural read-throughs.\n\n${context}`,
    { maxTokens: 800 }
  );

  console.log("Raw output:");
  console.log(editorialBriefing);
}

run().catch(console.error);
