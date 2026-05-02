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
        BigDecimal currentModelValue = publicHoldings.stream()
            .map(MultibaggerHolding::currentModelValueInr)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalPnl = currentModelValue
            .subtract(BigDecimal.valueOf(MODEL_CAPITAL))
            .setScale(2, RoundingMode.HALF_UP);
        BigDecimal sinceLaunchPercent = returnPercent(BigDecimal.valueOf(MODEL_CAPITAL), currentModelValue);
        return new MultibaggerState(
            "Concentrated 5x Multibagger Model",
            MODEL_CAPITAL,
            MODEL_ENTRY_DATE,
            pricing.refreshedAt(),
            new QuoteStatus(
                pricing.mode(),
                pricing.refreshedAt(),
                "Public model prices refresh from the server when the live API is available. The static page shows the last published snapshot when the API is offline."
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
            holding("KPEL", "KPEL.BO", "KP Energy", "25", 125_000, "Anchor renewable alpha", "Low-PE renewable execution with strong revenue growth and room for rerating.", "Build first while valuation remains a small-cap growth bargain.", "Trim if receivables, project execution or group complexity worsen.", "Core hold / buy staged"),
            holding("DHABRIYA", "538715.BO", "Dhabriya Polywood", "20", 100_000, "Hidden-quality margin inflection", "Microcap quality candidate with PAT doubling and expanded EBITDA margin.", "Build after confirming liquidity and margin sustainability.", "Reduce if inventory, debt or receivables absorb earnings growth.", "Core hold / buy staged"),
            holding("PIGL", "PIGL.NS", "Power & Instrumentation Gujarat", "17.5", 87_500, "Microcap order-book asymmetry", "Order book is materially larger than market cap, with busduct optionality.", "Build capped exposure only while PAT margin catches up.", "Do not average down into low-margin working-capital strain.", "Capped alpha"),
            holding("JNKINDIA", "JNKINDIA.NS", "JNK India", "15", 75_000, "Order book entering P&L", "Order visibility is already touching reported earnings.", "Scale only after conversion without debtor blowout.", "Reduce if receivables expand faster than sales.", "Capped alpha"),
            holding("DYCL", "DYCL.NS", "Dynamic Cables", "12.5", 62_500, "Cleaner cable-cycle quality alpha", "Mid-teens valuation, PAT growth and capacity optionality.", "Build if order inflow, spreads and ramp stay disciplined.", "Trim if cable spreads or receivables turn.", "Quality alpha"),
            holding("TEMBO", "TEMBO.NS", "Tembo Global", "10", 50_000, "Capped high-asymmetry optionality", "Large order book and scaled profit create upside, but cash-flow and governance risks cap sizing.", "Hold as option-sized exposure only.", "Reduce quickly on weak cash flow, guarantees, related-party issues or dilution.", "Speculative cap")
        );
    }

    private MultibaggerHolding holding(String ticker, String yahooSymbol, String name, String weight, Integer amount, String role, String thesis, String buyRule, String breakRule, String status) {
        MultibaggerQuoteSnapshot quote = quoteService.snapshotFor(ticker);
        BigDecimal currentModelValue = BigDecimal.valueOf(amount)
            .multiply(quote.lastPrice())
            .divide(quote.entryPrice(), 2, RoundingMode.HALF_UP);
        BigDecimal modelPnl = currentModelValue
            .subtract(BigDecimal.valueOf(amount))
            .setScale(2, RoundingMode.HALF_UP);
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
            status,
            MODEL_ENTRY_DATE,
            quote.entryPrice(),
            quote.lastPrice(),
            quote.previousClose(),
            returnPercent(quote.previousClose(), quote.lastPrice()),
            quote.lastPriceAt(),
            quote.priceSource(),
            quote.isStale(),
            returnPercent(quote.entryPrice(), quote.lastPrice()),
            modelPnl,
            currentModelValue
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
            new SourceReference("KP Energy Q3 FY26 investor presentation", "https://kpenergy.in/kpedata/assets/uploads/Investor%20Presentation%20Q3%20FY26%20Performance.pdf"),
            new SourceReference("Dhabriya Polywood Q3/9M FY26 release", "https://www.polywood.org/wp-content/uploads/2020/12/Press-Release-Q3-9M-FY26.pdf"),
            new SourceReference("PIGL Q3 FY26 and order-book summary", "https://www.whalesbook.com/news/English/industrial-goodsservices/Power-and-Instrumentation-Q3-FY26-Revenue-Surges-43percent-Bags-indian-rupee124-Cr-Orders/69999ca0730b6847a5176b11"),
            new SourceReference("JNK India Q3 FY26 result summary", "https://www.icicidirect.com/research/equity/rapid-results/jnk-india-ltd"),
            new SourceReference("Dynamic Cables Q3 FY26 result summary", "https://www.icicidirect.com/research/equity/rapid-results/dynamic-cables-ltd"),
            new SourceReference("Tembo Global public filings and result material", "https://www.screener.in/company/TEMBO/")
        );
    }

    private static BigDecimal returnPercent(BigDecimal start, BigDecimal end) {
        return MultibaggerQuoteService.returnPercent(start, end);
    }
}
