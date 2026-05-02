package com.marketnarrative.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class DatabaseUrlEnvironmentPostProcessorTest {

    @Test
    void convertsRenderPostgresUrlToJdbcProperties() {
        MockEnvironment environment = new MockEnvironment()
            .withProperty("DATABASE_USERNAME", "narrative_user")
            .withProperty("DATABASE_PASSWORD", "secure-password");

        Map<String, Object> properties = DatabaseUrlEnvironmentPostProcessor.propertiesFrom(
            "postgresql://ignored:ignored@dpg-marketnarrative.internal:5432/market_narrative",
            environment
        );

        assertThat(properties)
            .containsEntry("spring.datasource.url", "jdbc:postgresql://dpg-marketnarrative.internal:5432/market_narrative")
            .containsEntry("spring.datasource.username", "narrative_user")
            .containsEntry("spring.datasource.password", "secure-password");
    }

    @Test
    void decodesCredentialsWhenSeparatePropertiesAreMissing() {
        MockEnvironment environment = new MockEnvironment();

        Map<String, Object> properties = DatabaseUrlEnvironmentPostProcessor.propertiesFrom(
            "postgres://market_user:p%40ss%24word@dpg-marketnarrative.internal/market_narrative",
            environment
        );

        assertThat(properties)
            .containsEntry("spring.datasource.url", "jdbc:postgresql://dpg-marketnarrative.internal/market_narrative")
            .containsEntry("spring.datasource.username", "market_user")
            .containsEntry("spring.datasource.password", "p@ss$word");
    }
}
