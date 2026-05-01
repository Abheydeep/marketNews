package com.marketnarrative.multibagger;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/multibagger")
public class PublicMultibaggerController {

    private final MultibaggerService multibaggerService;

    public PublicMultibaggerController(MultibaggerService multibaggerService) {
        this.multibaggerService = multibaggerService;
    }

    @GetMapping("/state")
    public MultibaggerState state() {
        return multibaggerService.publicState();
    }
}
