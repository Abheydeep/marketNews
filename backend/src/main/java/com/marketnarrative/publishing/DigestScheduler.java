package com.marketnarrative.publishing;

import java.time.LocalDate;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class DigestScheduler {

    private final DigestOrchestrator digestOrchestrator;
    private final String digestZone;

    public DigestScheduler(
        DigestOrchestrator digestOrchestrator,
        @Value("${app.digest.zone}") String digestZone
    ) {
        this.digestOrchestrator = digestOrchestrator;
        this.digestZone = digestZone;
    }

    @Scheduled(cron = "${app.digest.cron}", zone = "${app.digest.zone}")
    public void runScheduledDigest() {
        digestOrchestrator.run(LocalDate.now(ZoneId.of(digestZone)));
    }
}
