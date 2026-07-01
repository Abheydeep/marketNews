export function titleForDailyLead(dailyLead, marketUpdate = false) {
  const text = `${dailyLead?.label || ""} ${dailyLead?.headline || ""} ${dailyLead?.indiaImpact || ""}`.toLowerCase();
  if (dailyLead?.driverType === "crude" && /\b(iran|hormuz|trump|strike|war|deal)\b/.test(text)) {
    return marketUpdate ? "Iran Deal Hopes Pull Brent Lower" : "Iran Deal Hopes Put Brent In Focus";
  }
  if (marketUpdate) {
    return {
      crude: "Brent Move Drives India's Market Mood",
      rates: "Rates Steer The Market Mood",
      currency: "Currency Pressure In Focus For Indian Markets",
      tech: "Tech Breadth Drives The Market Mood",
      banks: "Bank Nifty In Focus For Indian Markets",
      asia: "Asia Risk Appetite Frames The Market Mood",
      market: "Market Breadth In Focus For Indian Markets"
    }[dailyLead?.driverType] || `${dailyLead?.label || "Market Breadth"} In Focus For Indian Markets`;
  }
  return {
    crude: "Brent Move Sets The Morning Risk",
    rates: "Rates Shape Opening Range",
    currency: "Currency Pressure Tests Nifty Open",
    tech: "Tech Breadth Tests Nifty Follow-Through",
    banks: "Bank Nifty Breadth Sets The Open",
    asia: "Asia Risk Appetite Frames Nifty Open",
    market: "Market Breadth Shapes Nifty Open"
  }[dailyLead?.driverType] || `${dailyLead?.label || "Market Breadth"} Shapes Nifty Open`;
}
