package com.marketnarrative.identity;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DemoUserInitializer implements ApplicationRunner {

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final boolean seedDemoAdmin;
    private final String demoAdminEmail;
    private final String demoAdminDisplayName;
    private final String demoAdminPassword;
    private final boolean seedTradingAdmin;
    private final String tradingAdminEmail;
    private final String tradingAdminDisplayName;
    private final String tradingAdminPassword;

    public DemoUserInitializer(
        UserAccountRepository userAccountRepository,
        PasswordEncoder passwordEncoder,
        @Value("${app.demo-users.seed-demo-admin:true}") boolean seedDemoAdmin,
        @Value("${app.demo-users.demo-admin-email:admin@marketnarrative.local}") String demoAdminEmail,
        @Value("${app.demo-users.demo-admin-display-name:Market Narrative Admin}") String demoAdminDisplayName,
        @Value("${app.demo-users.demo-admin-password:market-open}") String demoAdminPassword,
        @Value("${app.demo-users.seed-trading-admin:true}") boolean seedTradingAdmin,
        @Value("${app.security.trading-admin-email}") String tradingAdminEmail,
        @Value("${app.demo-users.trading-admin-display-name:Abhey Trading Admin}") String tradingAdminDisplayName,
        @Value("${app.demo-users.trading-admin-password:market-open}") String tradingAdminPassword
    ) {
        this.userAccountRepository = userAccountRepository;
        this.passwordEncoder = passwordEncoder;
        this.seedDemoAdmin = seedDemoAdmin;
        this.demoAdminEmail = demoAdminEmail;
        this.demoAdminDisplayName = demoAdminDisplayName;
        this.demoAdminPassword = demoAdminPassword;
        this.seedTradingAdmin = seedTradingAdmin;
        this.tradingAdminEmail = tradingAdminEmail;
        this.tradingAdminDisplayName = tradingAdminDisplayName;
        this.tradingAdminPassword = tradingAdminPassword;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (seedDemoAdmin) {
            seedAdmin(demoAdminEmail, demoAdminDisplayName, demoAdminPassword);
        }
        if (seedTradingAdmin) {
            seedAdmin(tradingAdminEmail, tradingAdminDisplayName, tradingAdminPassword);
        }
    }

    private void seedAdmin(String email, String displayName, String password) {
        if (password == null || password.isBlank()) {
            throw new IllegalStateException("Admin seed password must not be blank");
        }
        userAccountRepository.findByEmailIgnoreCase(email)
            .orElseGet(() -> userAccountRepository.save(new UserAccount(
                email,
                displayName,
                passwordEncoder.encode(password),
                UserRole.ADMIN
            )));
    }
}
