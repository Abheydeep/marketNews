package com.marketnarrative.multibagger;

import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/multibagger")
public class AdminMultibaggerController {

    private final MultibaggerService multibaggerService;

    public AdminMultibaggerController(MultibaggerService multibaggerService) {
        this.multibaggerService = multibaggerService;
    }

    @PostMapping(value = "/snapshots", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('admin:write')")
    public SnapshotUploadResult uploadSnapshot(@RequestPart("file") MultipartFile file) {
        try {
            return multibaggerService.uploadSnapshot(file);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to store uploaded image", ex);
        }
    }

    @PostMapping("/reviews/run")
    @PreAuthorize("hasAuthority('admin:write')")
    public MonthlyReviewResult runReview(@RequestBody MonthlyReviewRequest request) {
        return multibaggerService.runReview(request);
    }

    @PostMapping("/reviews/{id}/publish")
    @PreAuthorize("hasAuthority('publish:digest')")
    public MultibaggerState publishReview(@PathVariable String id) {
        try {
            return multibaggerService.publishReview(id);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage(), ex);
        }
    }
}
