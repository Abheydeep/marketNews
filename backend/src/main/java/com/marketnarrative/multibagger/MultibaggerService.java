package com.marketnarrative.multibagger;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MultibaggerService {

    private static final LocalDate MODEL_ENTRY_DATE = LocalDate.of(2026, 4, 27);
    private static final LocalDate PUBLISHED_REVIEW_DATE = LocalDate.of(2026, 5, 1);
    private static final Integer MODEL_CAPITAL = 500_000;

    private final MultibaggerQuoteService quoteService;
    private final Map<String, byte[]> snapshots = new ConcurrentHashMap<>();
    private final Map<String, MonthlyReviewResult> adminReviews = new ConcurrentHashMap<>();

    public MultibaggerService(MultibaggerQuoteService quoteService) {
        this.quoteService = quoteService;
    }

    public MultibaggerState publicState() {
        List<MultibaggerHolding> publicHoldings = holdings();
        PricingSnapshot pricing = quoteService.pricingSnapshot();
        boolean hasVerifiedPrices = !pricing.isStale() && publicHoldings.stream()
            .allMatch(holding -> holding.currentModelValueInr() != null && !holding.isStale());
        BigDecimal currentModelValue = hasVerifiedPrices
            ? publicHoldings.stream()
                .map(MultibaggerHolding::currentModelValueInr)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP)
            : null;
        BigDecimal totalPnl = hasVerifiedPrices
            ? currentModelValue
                .subtract(BigDecimal.valueOf(MODEL_CAPITAL))
                .setScale(2, RoundingMode.HALF_UP)
            : null;
        BigDecimal sinceLaunchPercent = hasVerifiedPrices
            ? returnPercent(BigDecimal.valueOf(MODEL_CAPITAL), currentModelValue)
            : null;
        return new MultibaggerState(
            "Concentrated 5x Multibagger Model",
            MODEL_CAPITAL,
            MODEL_ENTRY_DATE,
            pricing.refreshedAt(),
            new QuoteStatus(
                pricing.mode(),
                pricing.refreshedAt(),
                pricing.isStale()
                    ? "Current prices and returns are hidden until the server supplies verified live quotes."
                    : "Public model prices refresh from the server during Indian market hours."
            ),
            pricing,
            new PerformanceSnapshot(
                sinceLaunchPercent,
                MODEL_ENTRY_DATE,
                MODEL_ENTRY_DATE,
                "NIFTY 50",
                pricing.benchmark().returnPercent(),
                currentModelValue,
                totalPnl,
                "Model performance is calculated from the public model start date and model allocation weights."
            ),
            publicHoldings,
            methodology(),
            researchEvidence(),
            transactions(publicHoldings),
            monthlyReviews(),
            watchlist(),
            sources(),
            "Educational research tracker only. It is not investment advice, a recommendation, or a promise of returns."
        );
    }

    public SnapshotUploadResult uploadSnapshot(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Portfolio image is required");
        }
        String snapshotId = "snapshot-" + UUID.randomUUID();
        snapshots.put(snapshotId, file.getBytes());
        return new SnapshotUploadResult(
            snapshotId,
            "STORED",
            holdings().stream()
                .map(holding -> new ParsedPosition(
                    holding.ticker(),
                    new BigDecimal("0.62"),
                    "Image extraction placeholder; admin should confirm before review."
                ))
                .toList()
        );
    }

    public MonthlyReviewResult runReview(MonthlyReviewRequest request) {
        String month = request.month() == null || request.month().isBlank()
            ? YearMonth.now().toString()
            : request.month();
        String reviewId = "review-" + UUID.randomUUID();
        List<AdminReviewDecision> decisions = holdings().stream()
            .map(holding -> new AdminReviewDecision(
                holding.ticker(),
                holding.ticker().equals("TEMBO") ? "KEEP_CAPPED" : "KEEP",
                holding.ticker().equals("TEMBO") ? new BigDecimal("0.62") : new BigDecimal("0.76"),
                holding.breakRule(),
                "Admin-only review uses current positions, latest quotes, thesis rules and the uploaded image extraction.",
                holding.status()
            ))
            .toList();
        MonthlyReviewResult result = new MonthlyReviewResult(
            reviewId,
            month,
            decisions,
            "Admin-only reasoning is intentionally excluded from the public state."
        );
        adminReviews.put(reviewId, result);
        return result;
    }

    public MultibaggerState publishReview(String reviewId) {
        if (!adminReviews.containsKey(reviewId)) {
            throw new IllegalArgumentException("Review not found");
        }
        return publicState();
    }

    private List<MultibaggerHolding> holdings() {
        return List.of(
            holding("KPEL", "KPEL.BO", "KP Energy", "25", 125_000, "Anchor renewable alpha", "Low-PE renewable execution with strong revenue growth and room for rerating.", "Build first while valuation remains a small-cap growth bargain.", "Trim if receivables, project execution or group complexity worsen.", "Execution momentum must keep translating into profit and operating cash flow.", "Valuation-growth anchor with rerating room.", "Renewable project execution and order conversion.", "Delayed project cash collection would weaken the anchor role.", "Group complexity and debt-funded expansion must stay contained.", "Core hold / buy staged"),
            holding("DHABRIYA", "538715.BO", "Dhabriya Polywood", "20", 100_000, "Hidden-quality margin inflection", "Microcap quality candidate with PAT doubling and expanded EBITDA margin.", "Build after confirming liquidity and margin sustainability.", "Reduce if inventory, debt or receivables absorb earnings growth.", "Improved margin band must survive beyond one strong result.", "Valuation is acceptable only while earnings quality improves.", "Operating leverage from scale, product mix and margin recovery.", "Inventory build-up or debtor stretch would lower growth quality.", "Debt and working-capital funding must not rise faster than earnings.", "Core hold / buy staged"),
            holding("PIGL", "PIGL.NS", "Power & Instrumentation Gujarat", "17.5", 87_500, "Microcap order-book asymmetry", "Order book is materially larger than market cap, with busduct optionality.", "Build capped exposure only while PAT margin catches up.", "Do not average down into low-margin working-capital strain.", "Revenue growth has to become PAT-margin expansion.", "Order-book-to-market-cap asymmetry needs margin and cash proof.", "RDSS execution, busduct optionality and infrastructure orders.", "Large orders can strain billing, margins and debtor quality.", "Working-capital borrowing needs monthly review.", "Capped alpha"),
            holding("JNKINDIA", "JNKINDIA.NS", "JNK India", "15", 75_000, "Order book entering P&L", "Order visibility is already touching reported earnings.", "Scale only after conversion without debtor blowout.", "Reduce if receivables expand faster than sales.", "PAT acceleration must be supported by margin stability.", "The slot depends on underpriced order conversion.", "Industrial capex execution entering reported earnings.", "Receivables expanding faster than sales would be the main evidence break.", "Execution scale-up should avoid balance-sheet strain.", "Capped alpha"),
            holding("DYCL", "DYCL.NS", "Dynamic Cables", "12.5", 62_500, "Cleaner cable-cycle quality alpha", "Mid-teens valuation, PAT growth and capacity optionality.", "Build if order inflow, spreads and ramp stay disciplined.", "Trim if cable spreads or receivables turn.", "PAT growth should not rely on one-off commodity spread tailwinds.", "Mid-teens valuation leaves room for capacity optionality.", "Cable-cycle demand, solar DC products and e-beam capacity.", "Receivable quality and commodity-linked margin swings are key checks.", "Capacity ramp must avoid excessive leverage.", "Quality alpha"),
            holding("TEMBO", "TEMBO.NS", "Tembo Global", "10", 50_000, "Capped high-asymmetry optionality", "Large order book and scaled profit create upside, but cash-flow and governance risks cap sizing.", "Hold as option-sized exposure only.", "Reduce quickly on weak cash flow, guarantees, related-party issues or dilution.", "Profit scale-up matters only if operating cash flow confirms it.", "The market-cap/order-book gap is discounted until governance proof improves.", "Large order-book execution and infrastructure-linked demand.", "Cash-flow slippage, guarantees or delayed collections would break the case.", "Dilution, pledges, guarantees and related-party risk keep sizing capped.", "Speculative cap")
        );
    }

    private MultibaggerHolding holding(
        String ticker,
        String yahooSymbol,
        String name,
        String weight,
        Integer amount,
        String role,
        String thesis,
        String buyRule,
        String breakRule,
        String profitabilityLens,
        String valuationLens,
        String growthCatalyst,
        String conversionRisk,
        String capitalStructureRisk,
        String status
    ) {
        MultibaggerQuoteSnapshot quote = quoteService.snapshotFor(ticker);
        boolean hasVerifiedQuote = !quote.isStale() && quote.lastPrice() != null && quote.entryPrice() != null;
        BigDecimal currentModelValue = hasVerifiedQuote
            ? BigDecimal.valueOf(amount)
                .multiply(quote.lastPrice())
                .divide(quote.entryPrice(), 2, RoundingMode.HALF_UP)
            : null;
        BigDecimal modelPnl = hasVerifiedQuote
            ? currentModelValue
                .subtract(BigDecimal.valueOf(amount))
                .setScale(2, RoundingMode.HALF_UP)
            : null;
        return new MultibaggerHolding(
            ticker,
            yahooSymbol,
            name,
            new BigDecimal(weight),
            amount,
            role,
            thesis,
            buyRule,
            breakRule,
            profitabilityLens,
            valuationLens,
            growthCatalyst,
            conversionRisk,
            capitalStructureRisk,
            status,
            MODEL_ENTRY_DATE,
            quote.entryPrice(),
            quote.lastPrice(),
            quote.previousClose(),
            hasVerifiedQuote ? returnPercent(quote.previousClose(), quote.lastPrice()) : null,
            quote.lastPriceAt(),
            quote.priceSource(),
            quote.isStale(),
            hasVerifiedQuote ? returnPercent(quote.entryPrice(), quote.lastPrice()) : null,
            modelPnl,
            currentModelValue
        );
    }

    private MultibaggerMethodology methodology() {
        return new MultibaggerMethodology(
            "A multibagger candidate is a business that can compound the original model capital several times over a full cycle, not merely a stock with a short-term price spike.",
            "The public model tests a concentrated 5x-style research thesis through sizing discipline, monthly evidence review, and replacement logic.",
            List.of(
                "Profitability: ROE, ROCE, margin durability, and free-cash-flow conversion.",
                "Valuation: current multiple versus growth, balance-sheet quality, and rerating room.",
                "Growth catalysts: order-book conversion, capacity addition, sector tailwind, or operating leverage.",
                "Cash conversion: receivables, inventory, debtor days, and whether earnings turn into cash.",
                "Capital structure: debt, guarantees, dilution risk, and interest coverage.",
                "Replacement discipline: every holding must keep earning its slot against the challenger list."
            ),
            "A holding is replaced when the thesis weakens, valuation absorbs the upside, cash conversion breaks, or a challenger offers cleaner upside with lower evidence risk.",
            "Educational research tracker only. It is not stock advice, not a promise of returns, and not a demat statement mirror."
        );
    }

    private ResearchEvidence researchEvidence() {
        return new ResearchEvidence(
            LocalDate.of(2026, 5, 2),
            List.of(
                new ResearchEvidenceItem(
                    "10Y G-sec hurdle",
                    "Economic Times reported India's 10-year benchmark government bond yield closed at 7.01% on Apr 30, 2026, after touching 7.06%. The model treats that as a higher hurdle rate for equity rerating.",
                    "Economic Times",
                    "https://economictimes.indiatimes.com/markets/bonds/g-sec-10-year-yield-tops-7-as-oil-soars/articleshow/130661336.cms?from=mdr"
                ),
                new ResearchEvidenceItem(
                    "IT valuation reset",
                    "Economic Times listed Nifty IT at 29,353.90 on Apr 30, 2026 with a 19.36 P/E, 6.13 P/B, and negative 1Y return. This is watchlist context, not a published IT-sector allocation call.",
                    "Economic Times",
                    "https://economictimes.indiatimes.com/markets/indices/nifty-it"
                ),
                new ResearchEvidenceItem(
                    "Domestic savings base",
                    "AMFI reported Indian mutual fund AUM of Rs 73.73 lakh crore as on Mar 31, 2026 and 20.83 crore retail-heavy equity, hybrid and solution-oriented folios.",
                    "AMFI",
                    "https://www.amfiindia.com/articles/indian-mutual"
                ),
                new ResearchEvidenceItem(
                    "Bond access benchmark",
                    "RBI Retail Direct widened direct access to government securities for individual investors, so the equity model is judged against a visible fixed-income alternative.",
                    "Reserve Bank of India",
                    "https://www.rbi.org.in/scripts/FS_PressRelease.aspx?prid=52548"
                )
            ),
            List.of(
                new HoldingEvidence(
                    "KPEL",
                    List.of(
                        "K.P. Energy's Q3 FY26 total revenue was Rs 347.55 crore, up about 63% YoY, with PAT of Rs 41.35 crore, up 58% YoY.",
                        "The company investor-presentation hub lists Q3 FY26 material for primary cross-check.",
                        "The public thesis is execution-led renewable growth, not a generic green-energy story."
                    ),
                    "Operating cash flow, debtor days and project collections must confirm that revenue growth is converting into cash.",
                    "KP Energy investor presentations",
                    "https://kpenergy.in/Investor-Presentation"
                ),
                new HoldingEvidence(
                    "DHABRIYA",
                    List.of(
                        "Dhabriya reported Q3 FY26 revenue of Rs 65.66 crore, up 19.6% YoY.",
                        "Q3 FY26 EBITDA rose 56.5% YoY and PAT rose 100.5% YoY, showing margin-led operating leverage.",
                        "9M FY26 PAT was up 72.4% YoY in the company release."
                    ),
                    "The next two quarters need to show that the margin band survives without inventory, debt or receivable stress.",
                    "Dhabriya Q3/9M FY26 release",
                    "https://www.polywood.org/wp-content/uploads/2020/12/Press-Release-Q3-9M-FY26.pdf"
                ),
                new HoldingEvidence(
                    "PIGL",
                    List.of(
                        "Power & Instrumentation Gujarat reported Q3 FY26 total income of Rs 48.89 crore, up 43.2% YoY.",
                        "Q3 FY26 PAT was Rs 3.57 crore, up 14.4% YoY but down 24.2% QoQ.",
                        "The evidence supports capped sizing because revenue growth is ahead of profit growth."
                    ),
                    "Order wins must convert into better PAT margin and clean working-capital collection.",
                    "PIGL Q3 FY26 summary",
                    "https://www.kotakneo.com/financial-results/power-instrumentation-gujarat-share-price-q3fy2025-26-results/"
                ),
                new HoldingEvidence(
                    "JNKINDIA",
                    List.of(
                        "JNK India reported Q3 FY26 revenue of Rs 2,062.3 million, up 113% YoY.",
                        "Q3 FY26 PAT was Rs 180.2 million, up 535% YoY, from a depressed prior-year base.",
                        "The company cited a total order book of Rs 17,611 million at the 9M FY26 mark."
                    ),
                    "Receivables and execution pace must stay controlled as order-book conversion enters reported earnings.",
                    "JNK India Q3 FY26 summary",
                    "https://www.icicidirect.com/research/equity/rapid-results/jnk-india-ltd"
                ),
                new HoldingEvidence(
                    "DYCL",
                    List.of(
                        "Dynamic Cables reported Q3 FY26 revenue of Rs 29,876.77 lakh, up 19% YoY.",
                        "Q3 FY26 PAT was Rs 2,242.27 lakh, up 42% YoY.",
                        "The evidence fits a cleaner cable-cycle quality slot rather than a pure story stock."
                    ),
                    "Margins need to hold through commodity swings, receivable quality and capacity ramp-up.",
                    "Dynamic Cables Q3 FY26 summary",
                    "https://www.icicidirect.com/research/equity/rapid-results/dynamic-cables-ltd"
                ),
                new HoldingEvidence(
                    "TEMBO",
                    List.of(
                        "Tembo public announcements cited Q3 revenue near Rs 251 crore and an order book near Rs 1,484 crore.",
                        "Screener's announcement list also shows NSE fine disclosure and large EGM approvals for borrowings, charges, investments and guarantees.",
                        "The evidence supports optionality but also explains why the model caps the weight."
                    ),
                    "Cash-flow confirmation, governance cleanup and financing discipline are required before any higher-conviction role.",
                    "Tembo public filings/announcements",
                    "https://www.screener.in/company/TEMBO/"
                )
            ),
            List.of(
                "This evidence layer is dated context, not a trading signal or return promise.",
                "The model avoids unverified percentile claims, unsourced ROE figures and short-term return claims.",
                "Public data excludes demat-level positions, account values and unpublished admin review notes."
            )
        );
    }

    private List<PublicTransaction> transactions(List<MultibaggerHolding> publicHoldings) {
        List<PublicTransaction> rows = new ArrayList<>();
        for (MultibaggerHolding holding : publicHoldings) {
            rows.add(new PublicTransaction(
                MODEL_ENTRY_DATE,
                holding.ticker(),
                "MODEL_BUY",
                holding.targetWeight(),
                "Public model buy for " + holding.role().toLowerCase() + ".",
                holding.entryPrice(),
                "Return tracking starts from the 2026-04-27 model price."
            ));
        }
        return rows;
    }

    private List<PublicMonthlyReview> monthlyReviews() {
        return List.of(new PublicMonthlyReview(
            "2026-05",
            PUBLISHED_REVIEW_DATE,
            "Model launched after the deep-dive portfolio reset",
            holdings().stream()
                .map(holding -> new PublicMonthlyReview.PublicReviewDecision(
                    holding.ticker(),
                    holding.ticker().equals("TEMBO") ? "KEEP CAPPED" : "KEEP",
                    holding.status()
                ))
                .toList(),
            List.of(
                "Moved from a broad basket to a concentrated six-stock public model.",
                "Kept CPCL outside the model as a tactical refinery trade.",
                "Moved HPL, EPack, eMudhra and Windlas to backup/watch status."
            )
        ));
    }

    private List<WatchlistItem> watchlist() {
        return List.of(
            new WatchlistItem("DELTNCBL", "Delton Cables", "Watch / capped challenger", "Order-book math is attractive, but leverage and copper/input-cost risk need proof."),
            new WatchlistItem("GALAPREC", "Gala Precision", "Watch / quality challenger", "Precision industrial growth is good, but valuation and margin compression keep it outside the top six."),
            new WatchlistItem("SHARDAMOTR", "Sharda Motor", "Quality ballast", "Useful low-PE quality name, but lower 5x torque than the concentrated alpha basket."),
            new WatchlistItem("MARKOLINES", "Markolines", "Tiny optionality", "Interesting order-book asymmetry, but liquidity and debtor risk make it too small for the primary model."),
            new WatchlistItem("CPCL", "Chennai Petroleum", "Tactical side trade", "Refinery-cycle value is real, but not treated as permanent compounding.")
        );
    }

    private List<SourceReference> sources() {
        return List.of(
            new SourceReference("KP Energy Q3 FY26 investor presentation", "https://kpenergy.in/Investor-Presentation"),
            new SourceReference("Dhabriya Polywood Q3/9M FY26 release", "https://www.polywood.org/wp-content/uploads/2020/12/Press-Release-Q3-9M-FY26.pdf"),
            new SourceReference("PIGL Q3 FY26 summary", "https://www.kotakneo.com/financial-results/power-instrumentation-gujarat-share-price-q3fy2025-26-results/"),
            new SourceReference("JNK India Q3 FY26 result summary", "https://www.icicidirect.com/research/equity/rapid-results/jnk-india-ltd"),
            new SourceReference("Dynamic Cables Q3 FY26 result summary", "https://www.icicidirect.com/research/equity/rapid-results/dynamic-cables-ltd"),
            new SourceReference("Tembo Global public filings and result material", "https://www.screener.in/company/TEMBO/"),
            new SourceReference("Economic Times 10Y G-sec yield note", "https://economictimes.indiatimes.com/markets/bonds/g-sec-10-year-yield-tops-7-as-oil-soars/articleshow/130661336.cms?from=mdr"),
            new SourceReference("Economic Times Nifty IT metrics", "https://economictimes.indiatimes.com/markets/indices/nifty-it"),
            new SourceReference("AMFI mutual fund industry data", "https://www.amfiindia.com/articles/indian-mutual"),
            new SourceReference("RBI Retail Direct release", "https://www.rbi.org.in/scripts/FS_PressRelease.aspx?prid=52548")
        );
    }

    private static BigDecimal returnPercent(BigDecimal start, BigDecimal end) {
        return MultibaggerQuoteService.returnPercent(start, end);
    }
}
