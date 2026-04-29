package com.marketnarrative.publishing;

import com.marketnarrative.assets.AssetGeneration;
import com.marketnarrative.assets.AssetGenerationRepository;
import com.marketnarrative.assets.AssetPromptService;
import com.marketnarrative.narrative.DailyScript;
import com.marketnarrative.narrative.DailyScriptRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin")
public class AdminDigestController {

    private final DigestOrchestrator digestOrchestrator;
    private final PublicDigestService publicDigestService;
    private final DailyScriptRepository dailyScriptRepository;
    private final AssetPromptService assetPromptService;
    private final AssetGenerationRepository assetGenerationRepository;
    private final String digestZone;

    public AdminDigestController(
        DigestOrchestrator digestOrchestrator,
        PublicDigestService publicDigestService,
        DailyScriptRepository dailyScriptRepository,
        AssetPromptService assetPromptService,
        AssetGenerationRepository assetGenerationRepository,
        @Value("${app.digest.zone}") String digestZone
    ) {
        this.digestOrchestrator = digestOrchestrator;
        this.publicDigestService = publicDigestService;
        this.dailyScriptRepository = dailyScriptRepository;
        this.assetPromptService = assetPromptService;
        this.assetGenerationRepository = assetGenerationRepository;
        this.digestZone = digestZone;
    }

    @PostMapping("/digest/run")
    @PreAuthorize("hasAuthority('admin:write')")
    public DigestRunResult runDigest(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return digestOrchestrator.run(date == null ? LocalDate.now(ZoneId.of(digestZone)) : date);
    }

    @GetMapping("/digest/{date}")
    public PublicDigestDto getDigest(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return publicDigestService.getDigest(date);
    }

    @PutMapping("/scripts/{id}")
    @PreAuthorize("hasAuthority('admin:write')")
    @CacheEvict(cacheNames = "publicDigest", allEntries = true)
    public DailyScript updateScript(@PathVariable Long id, @Valid @RequestBody UpdateScriptRequest request) {
        DailyScript script = dailyScriptRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Script not found"));
        script.replaceScript(request.onePageSummary(), request.teleprompterScript());
        return dailyScriptRepository.save(script);
    }

    @PostMapping("/scripts/{id}/regenerate")
    @PreAuthorize("hasAuthority('admin:write')")
    @CacheEvict(cacheNames = "publicDigest", allEntries = true)
    public DailyScript regenerateScript(@PathVariable Long id) {
        DailyScript script = dailyScriptRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Script not found"));
        DigestRunResult result = digestOrchestrator.run(script.getDigestDate());
        return dailyScriptRepository.findById(result.scriptId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Regenerated script missing"));
    }

    @PostMapping("/assets/generate")
    @PreAuthorize("hasAuthority('admin:write')")
    @CacheEvict(cacheNames = "publicDigest", allEntries = true)
    public AssetGeneration generateAsset(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        LocalDate digestDate = date == null ? LocalDate.now(ZoneId.of(digestZone)) : date;
        DailyScript script = dailyScriptRepository.findByDigestDate(digestDate)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Digest not generated"));
        return assetGenerationRepository.save(assetPromptService.generatePromptPackage(digestDate, script.getOverallSentiment()));
    }

    @PostMapping("/digest/{date}/publish")
    @PreAuthorize("hasAuthority('admin:write')")
    @CacheEvict(cacheNames = "publicDigest", allEntries = true)
    public DailyScript publish(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        DailyScript script = dailyScriptRepository.findByDigestDate(date)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Digest not generated"));
        script.publish();
        return dailyScriptRepository.save(script);
    }

    public record UpdateScriptRequest(
        @NotBlank String onePageSummary,
        @NotBlank String teleprompterScript
    ) {
    }
}
