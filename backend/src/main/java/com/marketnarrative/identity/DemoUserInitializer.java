package com.marketnarrative.identity;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DemoUserInitializer implements ApplicationRunner {

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;

    public DemoUserInitializer(UserAccountRepository userAccountRepository, PasswordEncoder passwordEncoder) {
        this.userAccountRepository = userAccountRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        userAccountRepository.findByEmailIgnoreCase("admin@marketnarrative.local")
            .orElseGet(() -> userAccountRepository.save(new UserAccount(
                "admin@marketnarrative.local",
                "Market Narrative Admin",
                passwordEncoder.encode("market-open"),
                UserRole.ADMIN
            )));
    }
}
