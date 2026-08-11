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
      tech: "Tech Sector Momentum Drives The Market Mood",
      banks: "Bank Nifty In Focus For Indian Markets",
      asia: "Asia Market Sentiment Frames The Market Mood",
      market: "Market Momentum In Focus For Indian Markets"
    }[dailyLead?.driverType] || `${dailyLead?.label || "Market Momentum"} In Focus For Indian Markets`;
  }
  return {
    crude: "Brent Move Sets The Morning Risk",
    rates: "Rates Shape Initial Hour Levels",
    currency: "Currency Pressure Tests Nifty Open",
    tech: "Tech Sector Momentum Tests Nifty Follow-Through",
    banks: "Bank Nifty Momentum Sets The Open",
    asia: "Asia Market Sentiment Frames Nifty Open",
    market: "Market Momentum Shapes Nifty Open"
  }[dailyLead?.driverType] || `${dailyLead?.label || "Market Momentum"} Shapes Nifty Open`;
}
