package com.marketnarrative.publishing;

import java.time.LocalDate;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/digest")
public class PublicDigestController {

    private final PublicDigestService publicDigestService;
    private final String digestZone;

    public PublicDigestController(
        PublicDigestService publicDigestService,
        @Value("${app.digest.zone}") String digestZone
    ) {
        this.publicDigestService = publicDigestService;
        this.digestZone = digestZone;
    }

    @GetMapping("/today")
    public PublicDigestDto today() {
        return publicDigestService.getDigest(LocalDate.now(ZoneId.of(digestZone)));
    }

    @GetMapping("/{date}")
    public PublicDigestDto byDate(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return publicDigestService.getDigest(date);
    }
}
